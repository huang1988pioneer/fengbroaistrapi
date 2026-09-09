import { lazy, Suspense, type ComponentType } from 'react';
export default function dynamic<P extends object = {}>(
  loader: () => Promise<{ default: ComponentType<P> } | ComponentType<P>>,
  options: { loading?: ComponentType; ssr?: boolean } = {},
) {
  const Component = lazy(async () => {
    const module = await loader();
    return typeof module === 'function' ? { default: module } : module as { default: ComponentType<P> };
  });
  const Render = Component as unknown as ComponentType<P>;
  const Loading = options.loading;
  return function LazyModule(props: P) {
    return <Suspense fallback={Loading ? <Loading /> : <p role="status">載入中…</p>}><Render {...props} /></Suspense>;
  };
}
