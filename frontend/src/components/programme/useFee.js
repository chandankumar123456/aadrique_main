import { useProgrammeConfig } from "@/lib/api";
import { EARLY_BIRD_SEATS } from "@/lib/programme";

export const EARLY_BIRD_PRICE = 14999;
export const REGULAR_PRICE = 17999;

/**
 * Today's price, from real seat data. The early-bird fee holds until its seats are
 * claimed, then the regular fee applies. Until the API answers we show early-bird
 * (the state at launch) rather than flash the wrong price.
 */
export const useFee = () => {
  const { data } = useProgrammeConfig();
  const open = data?.early_bird?.open ?? true;
  return {
    open,
    left: data?.early_bird?.left ?? null,
    total: EARLY_BIRD_SEATS,
    price: open ? EARLY_BIRD_PRICE : REGULAR_PRICE,
    loaded: Boolean(data),
  };
};
