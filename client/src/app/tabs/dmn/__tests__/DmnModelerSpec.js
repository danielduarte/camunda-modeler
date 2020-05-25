/**
 * Copyright Camunda Services GmbH and/or licensed to Camunda Services GmbH
 * under one or more contributor license agreements. See the NOTICE file
 * distributed with this work for additional information regarding copyright
 * ownership.
 *
 * Camunda licenses this file to you under the MIT; you may not use this file
 * except in compliance with the MIT License.
 */

import TestContainer from 'mocha-test-container-support';

import DmnModeler from '../modeler/DmnModeler';
import DrdViewer from '../modeler/DrdViewer';

import diagramXML from './diagram.dmn';

import 'dmn-js/dist/assets/diagram-js.css';
import 'dmn-js/dist/assets/dmn-font/css/dmn-embedded.css';
import 'dmn-js/dist/assets/dmn-js-decision-table-controls.css';
import 'dmn-js/dist/assets/dmn-js-decision-table.css';
import 'dmn-js/dist/assets/dmn-js-drd.css';
import 'dmn-js/dist/assets/dmn-js-literal-expression.css';
import 'dmn-js/dist/assets/dmn-js-shared.css';

const DEFAULT_OPTIONS = {
  exporter: {
    name: 'my-tool',
    version: '120-beta.100'
  }
};

inlineCSS(`
  .test-content-container {
    display: flex;
    flex-direction: row;
  }

  .modeler-container,
  .overview-container {
    height: 100%;
  }

  .overview-container {
    width: 200px;
  }
`);


describe('DmnModeler', function() {

  this.timeout(10000);

  let modelerContainer,
      overviewContainer;

  beforeEach(function() {
    modelerContainer = document.createElement('div');
    modelerContainer.classList.add('modeler-container');

    overviewContainer = document.createElement('div');
    overviewContainer.classList.add('overview-container');

    const container = TestContainer.get(this);

    container.appendChild(overviewContainer);
    container.appendChild(modelerContainer);
  });


  it('should bootstrap', async function() {

    // when
    const modeler = await createModeler({
      container: modelerContainer
    });

    // then
    expect(modeler).to.exist;
  });


  it('#getStackIdx', async function() {

    // when
    const modeler = await createModeler({
      container: modelerContainer
    });

    // then
    expect(modeler.getStackIdx()).to.equal(-1);
  });


  describe('overview', function() {

    let modeler;

    beforeEach(async function() {
      modeler = await createModeler({
        container: modelerContainer
      });

      modeler.attachOverviewTo(overviewContainer);
    });


    it('should have overview', function() {

      // then
      expect(modeler._overview).to.exist;
      expect(modeler._overview instanceof DrdViewer).to.be.true;
    });


    it('should import XML initially', function() {

      // then
      expect(modeler._overview.getDefinitions()).to.exist;
    });


    it('should update overview on command stack changed', function(done) {

      // given
      modeler._overview.on('import.done', () => {

        // then
        done();
      });

      // when
      modeler.on('views.changed', ({ activeView }) => {

        // assume
        expect(activeView.type).to.equal('drd');

        modeler.getActiveViewer().get('eventBus').fire('commandStack.changed');
      });
    });


    it('should listen to current command stack changed', function(done) {

      // given
      modeler._overview.on('import.done', () => {

        // then
        done();
      });

      // when
      openDecisionTable(modeler);

      modeler.on('views.changed', ({ activeView }) => {

        // assume
        expect(activeView.type).to.equal('decisionTable');

        modeler.getActiveViewer().get('eventBus').fire('commandStack.changed');
      });
    });


    it('should highlight currently open DRG element', function() {

      // when
      openDecisionTable(modeler);

      modeler.on('views.changed', ({ activeView }) => {

        // assume
        expect(activeView.type).to.equal('decisionTable');

        // then
        expect(overviewContainer.querySelectorAll('.djs-element.open')).to.have.length(1);
      });
    });


    it('should open DRG element on click', function() {

      // given
      openLiteralExpression(modeler);

      // assume
      expect(modeler.getActiveView().type).to.equal('literalExpression');

      // when
      modeler._overview.getActiveViewer().get('eventBus').fire('openDrgElement', {
        id: 'Decision_13nychf'
      });

      // then
      expect(modeler.getActiveView().element.id).to.equal('Decision_13nychf');
    });

  });

});

// helpers //////////

// create modeler and wait for modeler and overview import to finish before returning modeler
async function createModeler(options = {}) {
  const modeler = new DmnModeler({
    ...DEFAULT_OPTIONS,
    ...options
  });

  const overviewImport = new Promise(resolve => {
    modeler._overview.on('import.done', ({ err, warnings }) => {

      // assume
      expect(err).not.to.exist;
      expect(warnings).to.be.empty;

      resolve();
    });
  });

  const modelerImport = new Promise(resolve => {
    modeler.importXML(diagramXML, (err, warnings) => {

      // assume
      expect(err).not.to.exist;
      expect(warnings).to.be.empty;

      resolve();
    });
  });

  return Promise.all([ overviewImport, modelerImport ]).then(() => modeler);
}

function inlineCSS(css) {
  var head = document.head || document.getElementsByTagName('head')[ 0 ],
      style = document.createElement('style');

  style.type = 'text/css';

  if (style.styleSheet) {
    style.styleSheet.cssText = css;
  } else {
    style.appendChild(document.createTextNode(css));
  }

  head.appendChild(style);
}

function openDecisionTable(modeler) {
  const views = modeler.getViews();

  const view = views.find(({ type }) => type === 'decisionTable');

  modeler.open(view);
}

function openDrd(modeler) {
  const views = modeler.getViews();

  const view = views.find(({ type }) => type === 'drd');

  modeler.open(view);
}

function openLiteralExpression(modeler) {
  const views = modeler.getViews();

  const view = views.find(({ type }) => type === 'literalExpression');

  modeler.open(view);
}