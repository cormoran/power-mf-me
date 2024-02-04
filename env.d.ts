/// <reference types="vite/client" />
declare const GM: any

interface Window {
  GM_addStyle: typeof GM.addStyle | undefined
}
