import React, { useEffect, useState } from 'react';
import { Setting } from './setting';
import { MapContent } from './components/mapcontent';
import AMapLoader from '@amap/amap-jsapi-loader';
// import { useMount } from 'ahooks';
import { IPlugins } from './interface/map';
import { useCloudStorage, useMeta } from '@vikadata/widget-sdk';
declare global {
  interface Window { 
    AMap: any, // 地图API
    amap: any, // 地图实例
    infoWindow: any, // 信息弹窗实例
    _AMapSecurityConfig: any
  }
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
  const [apiToken] = useCloudStorage<string>('apiToken', '5b625cd96fdd79c2918cf5ec2cd7720c');
  const [securityJsCode] = useCloudStorage<string>('securityJsCode', '41d2e666297c21beda8897b2dfecc92f');
  window._AMapSecurityConfig = {
    securityJsCode: securityJsCode || '41d2e666297c21beda8897b2dfecc92f',
  }
  // 组件初始化时，加载 sdk 地图实例
  useEffect(() => {
    if(window.AMap) {
      setAMap(window.AMap);
      return;
    }
    console.log('apiToken', apiToken);
    AMapLoader.load({
      "key": apiToken || '5b625cd96fdd79c2918cf5ec2cd7720c',
      "version": "2.0",
      "plugins":[
        'AMap.Geocoder', 
        "AMap.Transfer", 
        "AMap.ToolBar", 
        "AMap.AutoComplete",
        "AMap.PlaceSearch",
        "AMap.MarkerClusterer"
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
      mapStyle: 'amap://styles/b379277160c9c3ce520627ad2e4bd22c'
    });
    setMap(amap);

    // 添加工具条
    // amap.addControl(new AMap.ToolBar());
    window.amap = amap;


    // 设置路径导航插件
    const transfer = new AMap.Transfer({
      // city 指定进行编码查询的城市，支持传入城市名、adcode 和 citycode
      city: '全国',
      map: amap,
      hideMarkers: true,
      extensions: 'all',
      policy: 'LEAST_TIME',
      panel: 'commute'
    });
   

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

    setPlugins({
      transfer,
      geocoder,
      autoComplete
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
      map.setMapStyle('amap://styles/b379277160c9c3ce520627ad2e4bd22c');
    } else {
      map.setMapStyle('amap://styles/2631e0b37c5791cd1a54ce45f94c16a7');
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
