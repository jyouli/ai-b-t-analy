import React, { Suspense } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { Spin } from 'antd';
import BasicLayout from 'src/layouts/BasicLayout';
// 路由表与 hideMenu 等布局字段见 ./routeConfig.js
import { routeConfig } from './routeConfig';

function PageLoading() {
  return (
    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: 200, height: '100%' }}>
      <Spin size="large" />
    </div>
  );
}

export default function AppRoutes() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<BasicLayout />}>
          {routeConfig.map(({ index, path, element, component }) =>
            index ? (
              <Route key="index" index element={element} />
            ) : (
              <Route key={path} path={path} element={<LazyElement importFn={component} />} />
            )
          )}
          <Route path="*" element={<LazyElement importFn={() => import('./NotFound')} />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

const LazyElements = new Map();

function LazyElement({ importFn }) {
  if (!LazyElements.has(importFn)) {
    LazyElements.set(importFn, React.lazy(importFn));
  }
  const Component = LazyElements.get(importFn);
  return (
    <Suspense fallback={<PageLoading />}>
      <Component />
    </Suspense>
  );
}
