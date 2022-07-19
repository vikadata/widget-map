import React, { useEffect, useState } from 'react';
import { Setting } from './setting';
import { MapContent } from './components/mapcontent';
import AMapLoader from '@amap/amap-jsapi-loader';
import { IPlugins, IMapToken } from './interface/map';
import { useCloudStorage, useMeta } from '@vikadata/widget-sdk';
import "@amap/amap-jsapi-types";

declare global {
  interface Window { 
    AMap: any, // 地图API
    infoWindow: AMap.InfoWindow, // 信息弹窗实例
    _AMapSecurityConfig: IAMapSecurityConfig,
    Loca: any
  }
}

interface IAMapSecurityConfig {
  securityJsCode: string;
}


export const MapComponent: React.FC = () => {

  // 高德基础类
  const [AMap, setAMap] = useState<any>();

  // 地图实例
  const [map, setMap] = useState<any>();

  // 插件加载状态
  const [lodingStatus, setLodingtatus] = useState<boolean>(false);

  // 配置好的插件对象集合
  const [plugins, setPlugins] = useState<IPlugins>();
  // 高德apiToken
  const [mapToken] = useCloudStorage<IMapToken>('mapToken', {
    key: null,
    security: null
  });

  
  
  // 组件初始化时，加载 sdk 地图实例
  useEffect(() => {
    if(window.AMap) {
      setAMap(window.AMap);
      return;
    }
    console.log('AMapLoader--->', AMapLoader);

    window._AMapSecurityConfig = {
      securityJsCode: mapToken.security || 'e21828e25e02c281835f7b65c42fc418',
    }
    
    AMapLoader.load({
      "key": mapToken.key || 'e979c61a0a16f0d80286e32c5075be6a',
      "version": "2.0",
      "plugins":[
        'AMap.Geocoder', 
        // "AMap.Transfer", 
        "AMap.ToolBar", 
        "AMap.AutoComplete",
        "AMap.PlaceSearch",
        "AMap.CitySearch"
      ],
      "AMapUI": {             // 是否加载 AMapUI，缺省不加载
          "version": '1.1',   // AMapUI 版本
          "plugins":['overlay/SimpleMarker'],       // 需要加载的 AMapUI ui插件
      },
      "Loca":{                // 是否加载 Loca， 缺省不加载
          "version": '2.0.0'  // Loca 版本，缺省 1.3.2
      },
    }).then((AMap) => {
      setLodingtatus(false);
      console.log('window._AMapSecurityConfig', window._AMapSecurityConfig);
      setAMap(AMap);
    }).catch(e=>{
        
        setLodingtatus(false);
        console.log('地图加载失败原因---->', e);
    });
   
  }, [mapToken]);

  // 初始化地图
  useEffect(() => {
    console.log('执行2');
    if(!AMap) {
      return;
    }
    console.log('执行3');
    initMap(AMap);
    setLodingtatus(true);
  }, [AMap]);

  function initMap(AMap) {
  
    const amap = new AMap.Map('mapContainer', {
      zoom: 4,//级别
      viewMode: '2D',//使用3D视图
      // mapStyle: 'amap://styles/3b1fbc19e1b07d4fd0c21e8e09225605',
      jogEnable: false,
      animateEnable: false
    });
    setMap(amap);


    window.amap = amap;



    // 添加地址编码插件
    const geocoder = new AMap.Geocoder({
      city: '全国',
      batch: true
    });

    // 添加搜索插件
    const autoComplete = new AMap.AutoComplete({
      // 城市，默认全国 
      city: "全国",
      // 使用联想输入的input的id
      input: "searchInput"
    });

    // 城市定位
    const citySearch = new AMap.CitySearch();

    // Loca 数据可视化
    const Loca = window.Loca;
    setPlugins({
      //transfer,
      geocoder,
      autoComplete,
      citySearch,
      Loca
    });

  }

  // 地图样式切换
  const { theme } = useMeta();

  useEffect(() => {
    if(!map)
    {
      return;
    }

    if(theme === "light") {
      map.setMapStyle('amap://styles/3b1fbc19e1b07d4fd0c21e8e09225605');
    } else {
      map.setMapStyle('amap://styles/0c95e40f6b9a6ef8a0b203e23fc4599f');
    }

  }, [theme, map]);

  return (
    <div style={{ display: 'flex', height: '100%' }}>
      <div style={{ flexGrow: 1, overflow: 'auto'}}>
       <MapContent 
          lodingStatus={lodingStatus}
          AMap={AMap}
          map={map}
          plugins={plugins}
       />
      </div>
        <Setting />
    </div>
  );
};
