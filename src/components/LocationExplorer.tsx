"use client";

import { useState } from "react";
import { LocationCard } from "@/components/LocationCard";
import { RegionMap } from "@/components/RegionMap";
import { locations } from "@/lib/site-content";

export function LocationExplorer() {
  const [activeIndex, setActiveIndex] = useState(0);
  const activeLocation = locations[activeIndex];

  const showPrevious = () =>
    setActiveIndex((index) => (index - 1 + locations.length) % locations.length);

  const showNext = () => setActiveIndex((index) => (index + 1) % locations.length);

  const selectRegion = (regionId: string) => {
    const index = locations.findIndex((location) => location.regionId === regionId);
    if (index === -1) return;
    setActiveIndex(index);
  };

  return (
    <div className="relative z-20 mt-[2.6rem] px-[1.3rem] lg:ml-[5rem] lg:px-0">
      <LocationCard location={activeLocation} onPrevious={showPrevious} onNext={showNext} />
      <RegionMap activeRegionId={activeLocation.regionId} onSelectRegion={selectRegion} />
    </div>
  );
}
