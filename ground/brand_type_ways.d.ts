declare const EventMapBrand: unique symbol;

interface HTMLInputElement {
  readonly [EventMapBrand]?: HTMLElementEventMap;
}
interface HTMLButtonElement {
  readonly [EventMapBrand]?: HTMLElementEventMap;
}
interface HTMLVideoElement {
  readonly [EventMapBrand]?: HTMLVideoElementEventMap;
}
interface Window {
  readonly [EventMapBrand]?: WindowEventMap;
}

interface CustomEventMap2 extends HTMLElementEventMap { }

interface CustomElement extends HTMLInputElement { }
interface CustomElement2 extends HTMLInputElement {
  readonly [EventMapBrand]?: CustomEventMap2;
}

type EventMapX<T> =
  T extends { readonly [EventMapBrand]?: infer M }
  ? NonNullable<M>
  : never;

type EventMapX2<T extends { readonly [EventMapBrand]?: unknown }> = Exclude<T[typeof EventMapBrand], undefined>

type D = EventMapX<HTMLInputElement>
type D2 = EventMapX2<HTMLInputElement>

type D10 = EventMapX2<CustomElement>
type D12 = EventMapX2<CustomElement>

type D3 = EventMapX<Element>
type D4 = EventMapX2<Element> // error for better

export { }