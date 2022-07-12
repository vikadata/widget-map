export interface IPlugins {
  aMapUI?: any; // 高德地图UI
  simpleMarker?: any; // 标点UI
  geocoder?: any; // 地图转码
  transfer?: any; // 路线规划
  autoComplete?: any, // 搜索
  citySearch?: any, // 城市定位
}

export interface ISimpleRecords {
  id: string;
  address: string;
  title: string;
  location?: string[];
  isAddressUpdate?: boolean;
  isTitleUpdate?: boolean;
}

export interface IMapToken {
  key: string | null;
  security: string | null;
}