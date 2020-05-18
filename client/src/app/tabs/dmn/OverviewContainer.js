/**
 * Copyright Camunda Services GmbH and/or licensed to Camunda Services GmbH
 * under one or more contributor license agreements. See the NOTICE file
 * distributed with this work for additional information regarding copyright
 * ownership.
 *
 * Camunda licenses this file to you under the MIT; you may not use this file
 * except in compliance with the MIT License.
 */

import React, { PureComponent } from 'react';

import classNames from 'classnames';

import { isFunction } from 'min-dash';

import dragger from '../../../util/dom/dragger';

import css from './OverviewContainer.less';

import {
  throttle
} from '../../../util';

export const DEFAULT_LAYOUT = {
  open: true,
  width: 350
};

const MIN_WIDTH = 150,
      MAX_WIDTH = 650;


class OverviewContainerWrapped extends PureComponent {
  constructor(props) {
    super(props);

    this.handleResize = throttle(this.handleResize);
  }

  changeLayout = (newLayout) => {
    const { onLayoutChanged } = this.props;

    if (isFunction(onLayoutChanged)) {
      onLayoutChanged(newLayout);
    }
  }

  handleResizeStart = event => {
    const onDragStart = dragger(this.handleResize);

    this.originalWidth = this.currentWidth;

    onDragStart(event);
  }

  handleResize = (_, delta) => {
    const {
      x
    } = delta;

    if (x === 0) {
      return;
    }

    const width = Math.min(this.originalWidth + x, MAX_WIDTH);

    const open = width >= MIN_WIDTH;

    this.changeLayout({
      dmnOverview: {
        open,
        width
      }
    });
  }

  handleToggle = () => {
    const { layout } = this.props;

    const dmnOverview = layout.dmnOverview || DEFAULT_LAYOUT;

    this.changeLayout({
      dmnOverview: {
        ...dmnOverview,
        open: false
      }
    });
  }

  render() {
    const {
      layout,
      forwardedRef,
      className
    } = this.props;

    const dmnOverview = layout.dmnOverview || DEFAULT_LAYOUT;

    const { open } = dmnOverview;

    const width = open ? dmnOverview.width : 0;

    const dmnOverviewStyle = {
      width
    };

    this.currentWidth = width;

    return (
      <div
        className={ classNames(
          css.OverviewContainer,
          className,
          { open }
        ) }
        style={ dmnOverviewStyle }>
        {
          open &&
            <div
              className="resize-handle"
              draggable
              onDragStart={ this.handleResizeStart }
            ></div>
        }
        {
          open &&
            <div
              className="toggle"
              onClick={ this.handleToggle }
            ></div>
        }
        <div className="overview-container" ref={ forwardedRef }></div>
      </div>
    );
  }
}

export default React.forwardRef(
  function OverviewContainer(props, ref) {
    return <OverviewContainerWrapped { ...props } forwardedRef={ ref } />;
  }
);