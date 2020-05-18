/**
 * Copyright Camunda Services GmbH and/or licensed to Camunda Services GmbH
 * under one or more contributor license agreements. See the NOTICE file
 * distributed with this work for additional information regarding copyright
 * ownership.
 *
 * Camunda licenses this file to you under the MIT; you may not use this file
 * except in compliance with the MIT License.
 */

import DmnModeler from 'dmn-js/lib/Modeler';
import DrdModeler from 'dmn-js-drd/lib/Modeler';
import DrdViewer from './DrdViewer';

import diagramOriginModule from 'diagram-js-origin';

import alignToOriginModule from '@bpmn-io/align-to-origin';
import addExporter from '@bpmn-io/add-exporter/add-exporter';

import completeDirectEditingModule from '../../bpmn/modeler/features/complete-direct-editing';
import propertiesPanelModule from 'dmn-js-properties-panel';
import propertiesProviderModule from 'dmn-js-properties-panel/lib/provider/camunda';

import drdAdapterModule from 'dmn-js-properties-panel/lib/adapter/drd';

import propertiesPanelKeyboardBindingsModule from '../../bpmn/modeler/features/properties-panel-keyboard-bindings';
import decisionTableKeyboardModule from './features/decision-table-keyboard';

import Flags, { DISABLE_ADJUST_ORIGIN } from '../../../../util/Flags';

import camundaModdleDescriptor from 'camunda-dmn-moddle/resources/camunda';

import openDrgElementModule from './features/overview/open-drg-element';
import overviewRendererModule from './features/overview/overview-renderer';

import { is } from 'dmn-js-shared/lib/util/ModelUtil';

import { some } from 'min-dash';

import 'dmn-js/dist/assets/diagram-js.css';
import 'dmn-js/dist/assets/dmn-font/css/dmn-embedded.css';
import 'dmn-js/dist/assets/dmn-js-decision-table-controls.css';
import 'dmn-js/dist/assets/dmn-js-decision-table.css';
import 'dmn-js/dist/assets/dmn-js-drd.css';
import 'dmn-js/dist/assets/dmn-js-literal-expression.css';
import 'dmn-js/dist/assets/dmn-js-shared.css';

import 'dmn-js-properties-panel/dist/assets/dmn-js-properties-panel.css';

const NOOP_MODULE = [ 'value', null ];

const OVERVIEW_ZOOM_SCALE = 0.75;

const HIGH_PRIORITY = 2000;


export default class CamundaDmnModeler extends DmnModeler {

  constructor(options = {}) {

    const {
      moddleExtensions,
      drd,
      decisionTable,
      literalExpression,
      exporter,
      ...otherOptions
    } = options;

    super({
      ...otherOptions,
      drd: mergeModules(drd, [
        Flags.get(DISABLE_ADJUST_ORIGIN) ? diagramOriginModule : alignToOriginModule,
        propertiesPanelModule,
        propertiesProviderModule,
        drdAdapterModule,
        propertiesPanelKeyboardBindingsModule
      ]),
      decisionTable: mergeModules(decisionTable, [
        decisionTableKeyboardModule,
        {
          viewDrd: NOOP_MODULE
        }
      ]),
      literalExpression: mergeModules(literalExpression, [
        {
          viewDrd: NOOP_MODULE
        }
      ]),
      moddleExtensions: {
        camunda: camundaModdleDescriptor,
        ...(moddleExtensions || {})
      }
    });

    this.on('viewer.created', ({ viewer }) => {

      viewer.on('commandStack.changed', event => {
        this._emit('view.contentChanged', event);
      });

      viewer.on('selection.changed', event => {
        this._emit('view.selectionChanged', event);
      });

      viewer.on([ 'directEditing.activate', 'directEditing.deactivate' ], event => {
        this._emit('view.directEditingChanged', event);
      });

      viewer.on('error', ({ error }) => {
        this._emit('error', {
          viewer,
          error
        });
      });

    });

    addExporter(exporter, this);

    this._addOverview();
  }

  /**
   * Get stack index of active viewer.
   *
   * @returns {?number} Stack index or null.
   */
  getStackIdx() {
    const viewer = this.getActiveViewer();

    if (!viewer) {
      return null;
    }

    const commandStack = viewer.get('commandStack', false);

    if (!commandStack) {
      return null;
    }

    return commandStack._stackIdx;
  }

  _addOverview() {
    const overview = this._overview = new DrdViewer({
      drd: {
        additionalModules: [
          openDrgElementModule,
          overviewRendererModule
        ]
      }
    });

    const handleImport = err => {
      if (err) {
        console.log(err);
      } else {
        overview.getActiveViewer().get('canvas').zoom(OVERVIEW_ZOOM_SCALE);
      }
    };

    const updateOverview = () => {
      console.log('%cupdate overview', 'font-size: 24px;');

      this.saveXML((err, xml) => {
        if (err) {
          console.log(err);
        } else {
          overview.importXML(xml, handleImport);
        }
      });
    };

    // (1) import overview initially
    this.on('import.parse.start', ({ xml }) => {
      overview.importXML(xml, handleImport);
    });

    // (2) detach overview when editing DRD
    this.on('views.changed', HIGH_PRIORITY, ({ activeView }) => {
      if (activeView.type === 'drd') {
        this.detachOverview();
      }
    });

    let subscription = null;

    // (3) update overview on changes in modeler
    this.on('views.changed', ({ activeView }) => {
      if (subscription) {
        subscription.cancel();
      }

      const viewer = this._viewers[ activeView.type ];

      const eventBus = viewer.get('eventBus', false);

      const onCommandStackChanged = () => {
        if (subscription) {
          subscription.cancel();
        }

        eventBus.on('commandStack.changed', handleCommandStackChanged);

        subscription = {
          cancel: offCommandStackChanged
        };
      };

      const offCommandStackChanged = () => {
        eventBus.off('commandStack.changed', handleCommandStackChanged);
      };

      const handleCommandStackChanged = () => {

        // (2) stop listening until save XML done
        offCommandStackChanged();

        // (3) start listening again when save XML done
        this.once('saveXML.done', onCommandStackChanged);

        if (this.isOverviewAttached()) {
          updateOverview();
        } else {
          eventBus.once('attachOverview', 100, updateOverview);
        }

      };

      // (1) update overview on command stack change
      onCommandStackChanged();
    });

    let previousActiveViewType;

    // (4) highlight current open DRG element on views changed
    this.on('views.changed', ({ activeView }) => {
      if (activeView.type !== 'drd') {
        const activeViewer = overview.getActiveViewer();

        if (activeViewer) {
          activeViewer.get('eventBus').fire('drgElementOpened', {
            id: activeView.element.id,
            centerViewbox: previousActiveViewType === 'drd'
          });
        }
      }

      previousActiveViewType = activeView.type;
    });

    overview.once('import.done', () => {
      const activeViewer = overview.getActiveViewer();

      // (5) open DRG element on click
      activeViewer.on('openDrgElement', ({ id }) => {
        const view = this._views.find(({ element }) => {
          return element.id === id;
        });

        if (view && view.type !== 'drd') {
          this.open(view);
        }
      });
    });
  }

  attachOverviewTo(parentNode) {
    this.detachOverview();

    const activeViewer = this._overview.getActiveViewer();

    parentNode.appendChild(activeViewer._container);

    activeViewer.get('canvas').resized();

    activeViewer.get('eventBus').fire('attachOverview');
  }

  detachOverview() {
    const activeViewer = this._overview.getActiveViewer();

    const container = activeViewer._container;

    if (container && container.parentNode) {
      container.parentNode.removeChild(container);

      activeViewer.get('eventBus').fire('detachOverview');
    }
  }

  isOverviewAttached() {
    const activeViewer = this._overview.getActiveViewer();

    const container = activeViewer._container;

    return container && container.parentNode;
  }
}


// helpers ///////////////////////

function mergeModules(editorConfig = {}, additionalModules) {

  const editorModules = editorConfig.additionalModules || [];

  return {
    ...editorConfig,
    additionalModules: [
      completeDirectEditingModule,
      ...editorModules,
      ...additionalModules
    ]
  };
}