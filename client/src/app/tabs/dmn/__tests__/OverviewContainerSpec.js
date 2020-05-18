/**
 * Copyright Camunda Services GmbH and/or licensed to Camunda Services GmbH
 * under one or more contributor license agreements. See the NOTICE file
 * distributed with this work for additional information regarding copyright
 * ownership.
 *
 * Camunda licenses this file to you under the MIT; you may not use this file
 * except in compliance with the MIT License.
 */

/* global sinon */

import React from 'react';

import OverviewContainer from '../OverviewContainer';

import { mount } from 'enzyme';

/* global sinon */
const { spy } = sinon;


describe('<OverviewContainer>', function() {

  it('should render', function() {

    // given
    const { wrapper } = createOverviewContainer();

    // then
    expect(wrapper).to.exist;

    // clean
    wrapper.unmount();
  });


  it('should resize', function() {

    // given
    const layout = {
      dmnOverview: {
        open: true,
        width: 350
      }
    };
    const onLayoutChangedSpy = spy();

    const {
      wrapper,
      instance
    } = createOverviewContainer({
      layout,
      onLayoutChanged: onLayoutChangedSpy
    });

    instance.originalWidth = layout.dmnOverview.width;

    // when
    instance.handleResize(null, { x: -10 });

    // then
    expect(onLayoutChangedSpy).to.be.calledWith({ dmnOverview: { open: true, width: 340 } });

    // clean
    wrapper.unmount();
  });


  it('should close when resized to smaller than minimum size', function() {

    // given
    const layout = {
      dmnOverview: {
        open: true,
        width: 350
      }
    };
    const onLayoutChangedSpy = spy();

    const {
      wrapper,
      instance
    } = createOverviewContainer({
      layout,
      onLayoutChanged: onLayoutChangedSpy
    });

    instance.originalWidth = layout.dmnOverview.width;

    // when
    instance.handleResize(null, { x: -300 });

    // then
    expect(onLayoutChangedSpy).to.be.calledWith({ dmnOverview: { open: false, width: 50 } });

    // clean
    wrapper.unmount();
  });


  it('should ignore delta x = 0', function() {

    // given
    const layout = {
      dmnOverview: {
        open: true,
        width: 350
      }
    };
    const onLayoutChangedSpy = spy();

    const {
      wrapper,
      instance
    } = createOverviewContainer({
      layout,
      onLayoutChanged: onLayoutChangedSpy
    });

    instance.originalWidth = layout.dmnOverview.width;

    // when
    instance.handleResize(null, { x: 0 });

    // then
    expect(onLayoutChangedSpy).to.not.be.called;

    // clean
    wrapper.unmount();
  });

});



// helpers //////////
function createOverviewContainer(props = {}, mountFn = mount) {
  const componentProps = {
    layout: {
      dmnOverview: {
        open: true,
        width: 350
      }
    },
    ...props,
  };

  const wrapper = mountFn(<OverviewContainer { ...componentProps } />);
  const instance = wrapper.find('OverviewContainerWrapped').first().instance();

  return {
    wrapper,
    instance
  };
}