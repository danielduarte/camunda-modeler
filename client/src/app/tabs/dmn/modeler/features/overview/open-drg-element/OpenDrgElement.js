/**
 * Copyright Camunda Services GmbH and/or licensed to Camunda Services GmbH
 * under one or more contributor license agreements. See the NOTICE file
 * distributed with this work for additional information regarding copyright
 * ownership.
 *
 * Camunda licenses this file to you under the MIT; you may not use this file
 * except in compliance with the MIT License.
 */

import { isAny } from 'dmn-js-shared/lib/util/ModelUtil';

import { getBBox } from 'diagram-js/lib/util/Elements';

const CAN_OPEN_DRG_ELEMENT_MARKER = 'can-open',
      CURRENT_OPEN_DRG_ELEMENT_MARKER = 'open';


export default class OpenDrgElement {
  constructor(canvas, config, elementRegistry, eventBus) {
    this._canvas = canvas;

    let currentOpenDrgElementId;

    eventBus.on('import.done', () => {
      elementRegistry.forEach(element => {
        if (this.canOpenDrgElement(element)) {
          canvas.addMarker(element, CAN_OPEN_DRG_ELEMENT_MARKER);
        }
      });

      if (currentOpenDrgElementId) {
        const currentOpenDrgElement = elementRegistry.get(currentOpenDrgElementId);

        if (currentOpenDrgElement) {
          canvas.addMarker(currentOpenDrgElement, CURRENT_OPEN_DRG_ELEMENT_MARKER);
        }
      }
    });

    // keep track of overview open state
    const { layout } = config;

    let overviewOpen = layout.dmnOverview ? layout.dmnOverview.open : false;

    eventBus.on('layoutChanged', ({ layout }) => {
      if (layout.dmnOverview) {
        const isOverviewOpenChange = overviewOpen !== layout.dmnOverview.open;

        overviewOpen = layout.dmnOverview.open;

        if (!isOverviewOpenChange) {
          return;
        }
      }

      if (overviewOpen && currentOpenDrgElementId) {
        const currentOpenDrgElement = elementRegistry.get(currentOpenDrgElementId);

        if (currentOpenDrgElement) {
          this.centerViewbox(currentOpenDrgElement);
        }
      }
    });

    // highlight open DRG element and optionally center viewbox around it
    eventBus.on('drgElementOpened', ({ centerViewbox, id }) => {
      let currentOpenDrgElement;

      // (1) remove hightlight from previously open DRG element
      if (currentOpenDrgElementId) {
        currentOpenDrgElement = elementRegistry.get(currentOpenDrgElementId);

        if (currentOpenDrgElement) {
          canvas.removeMarker(currentOpenDrgElement, CURRENT_OPEN_DRG_ELEMENT_MARKER);
        }
      }

      currentOpenDrgElementId = id;

      currentOpenDrgElement = elementRegistry.get(currentOpenDrgElementId);

      // (2) add highligh to open DRG element
      if (currentOpenDrgElement) {
        canvas.addMarker(currentOpenDrgElement, CURRENT_OPEN_DRG_ELEMENT_MARKER);

        if (centerViewbox) {

          // (3) center viewbox around it once overview is open
          eventBus.once('attachOverview', () => {
            if (overviewOpen) {
              this.centerViewbox(currentOpenDrgElement);
            }
          });
        }
      }
    });

    // open DRG element on click
    eventBus.on('element.click', ({ element }) => {
      if (!this.canOpenDrgElement(element)) {
        return;
      }

      const { id } = element;

      eventBus.fire('openDrgElement', {
        id
      });
    });
  }

  canOpenDrgElement = (element) => {
    const { businessObject } = element;

    const hasDecisionLogic = !!businessObject.decisionLogic;

    return isAny(element, [ 'dmn:Decision', 'dmn:LiteralExpression' ]) && hasDecisionLogic;
  }

  centerViewbox = (element) => {
    var viewbox = this._canvas.viewbox();

    var box = getBBox(element);

    var newViewbox = {
      x: (box.x + box.width / 2) - viewbox.outer.width / 2,
      y: (box.y + box.height / 2) - viewbox.outer.height / 2,
      width: viewbox.outer.width,
      height: viewbox.outer.height
    };

    this._canvas.viewbox(newViewbox);

    this._canvas.zoom(viewbox.scale);
  }
}

OpenDrgElement.$inject = [
  'canvas',
  'config.openDrgElement',
  'elementRegistry',
  'eventBus'
];