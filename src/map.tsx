import React, { useEffect, useState } from 'react';
import { Setting } from './setting';
import { MapContent } from './components/mapcontent';
import AMapLoader from '@amap/amap-jsapi-loader';
// import { useMount } from 'ahooks';
import { IPlugins } from './interface/map';
import { useCloudStorage, useMeta } from '@vikadata/widget-sdk';
import "@amap/amap-jsapi-types";
declare global {
  interface Window { 
    AMap: any, // 地图API
    infoWindow: AMap.InfoWindow, // 信息弹窗实例
    _AMapSecurityConfig: IAMapSecurityConfig
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
  const [apiToken] = useCloudStorage<string>('apiToken', '');
  const [securityJsCode] = useCloudStorage<string>('securityJsCode', '');
  window._AMapSecurityConfig = {
    securityJsCode: 'e21828e25e02c281835f7b65c42fc418',
  }
  // 组件初始化时，加载 sdk 地图实例
  useEffect(() => {
    if(window.AMap) {
      setAMap(window.AMap);
      return;
    }
    console.log('apiToken', apiToken);
    AMapLoader.load({
      "key": 'e979c61a0a16f0d80286e32c5075be6a',
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
    }).then((AMap) => {
      setAMap(AMap);
    }).catch(e=>{
        setLodingtatus(false);
        console.log('地图加载失败原因---->', e);
    });
   
  }, [apiToken, securityJsCode]);

  // 初始化地图
  useEffect(() => {
    if(!AMap) {
      return;
    }
    initMap(AMap);
    setLodingtatus(true);
  }, [AMap]);

  function initMap(AMap) {
  
    const amap = new AMap.Map('mapContainer', {
      zoom: 4,//级别
      viewMode: '2D',//使用3D视图
      mapStyle: 'amap://styles/3b1fbc19e1b07d4fd0c21e8e09225605',
      jogEnable: false,
      animateEnable: false
    });
    setMap(amap);

    // 添加工具条
    // amap.addControl(new AMap.ToolBar());
    window.amap = amap;


    // 设置路径导航插件
    // const transfer = new AMap.Transfer({
    //   // city 指定进行编码查询的城市，支持传入城市名、adcode 和 citycode
    //   city: '全国',
    //   map: amap,
    //   hideMarkers: true,
    //   extensions: 'all',
    //   policy: 'LEAST_TIME',
    //   panel: 'commute'
    // });
   

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
    var citySearch = new AMap.CitySearch();

    setPlugins({
      //transfer,
      geocoder,
      autoComplete,
      citySearch
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
