/** Shared TronLink / tronWeb typings for the browser */
export type TronWebLike = {
  ready?: boolean;
  defaultAddress?: { base58?: string };
  toSun?: (v: number) => number;
  contract?: () => {
    at: (addr: string) => Promise<{
      transfer: (
        to: string,
        amount: number,
      ) => { send: (opts?: { feeLimit?: number }) => Promise<string> };
    }>;
  };
  trx?: {
    signMessageV2?: (msg: string) => Promise<string>;
  };
};

export type TronLinkProvider = {
  request: (args: {
    method: string;
    params?: Record<string, unknown>;
  }) => Promise<unknown>;
  tronWeb?: TronWebLike;
};

declare global {
  interface Window {
    tronLink?: TronLinkProvider;
    tronWeb?: TronWebLike;
  }
}

export {};
