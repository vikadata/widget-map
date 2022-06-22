import React, { useState, useEffect, useMemo } from 'react';
import { useCloudStorage, useRecords, useExpandRecord, IExpandRecord, useActiveCell, useRecord, useMeta, useField } from '@vikadata/widget-sdk';
import { getLocationAsync, getRcoresLocationAsync, updateMardkAddressRecord } from '../../utils/common';
import { useDebounce } from 'ahooks';
import { TextInput } from '@vikadata/components';
import styles from './style.module.less';
import { SearchOutlined, ZoomOutOutlined, ZoomInOutlined} from '@vikadata/icons';

import { useAsyncEffect } from '../../utils/hooks';
import markerIcon from '../../static/img/mark.svg';
import markerSelectedIcon from '../../static/img/markSelect.svg';
import { IPlugins, ISimpleRecords } from '../../interface/map';
import { slice } from 'lodash';
import "@amap/amap-jsapi-types";

interface mapContentProps {
  lodingStatus: boolean,
  AMap: any,
  map: any, // 地图实例
  plugins: IPlugins | undefined
}

// 最大限制列
const limitRcord = 500;


export const MapContent: React.FC<mapContentProps> = props => {

  const { lodingStatus, map, AMap, plugins} = props;

  // 获取表格视图ID
  const [viewId] = useCloudStorage<string>('selectedViewId');
  // 获取所有行的信息
  const records = useRecords(viewId);
  // 展开卡片
  const expandRecord = useExpandRecord();
  // 中心标点
  const [markerCenterLayer, setMarkerCenterLayer] = useState<any>();
  
  // 搜索输入
  const [searchKey, setSearchKey] = useState<string>();
  const debouncedSearchKey = useDebounce(searchKey, { wait: 500 });
  // 地址类型
  const [addressType] = useCloudStorage<string | number>('addressType', 'text');
  // 地址字段ID
  const [addressFieldId] = useCloudStorage<string>('address');
  // 名称字段ID
  const [titleFieldID] = useCloudStorage<string>('title');
  // 地址字段
  // const addressField = useField(addressFieldId);
  // 获取表格选中信息
  const activeCell = useActiveCell();
  const activeRecord = useRecord(activeCell?.recordId);
  const [updateMap] = useCloudStorage<boolean>('updateMap');

  // 地图标点集合
  const [markersLayer, setMakerslayer] = useState<AMap.Marker[]>();
  // 地理编码或者坐标转换之后的Records
  // const [markAddressRecords, setMarkAddressRecords] = useCloudStorage<any>('markAddressData');
  

  
  

  const iconDefaultConfig = useMemo(() => {
      return lodingStatus ? {
        image: markerIcon,
        anchor:'center',
        // imageSize: new AMap.Size(22, 22),   // 根据所设置的大小拉伸或压缩图片
      } : null;
  }, [AMap, lodingStatus]);
  
  const infoWindow =  useMemo(() => { 
    return lodingStatus ? new AMap.InfoWindow({
      content: '<div class="infowindowContent" >11111</div>',  //传入 dom 对象，或者 html 字符串
      offset: [22, -12],
      isCustom: true,
      anchor: 'middle-left'
    }) : null;
  }, [AMap, lodingStatus]);

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
  

  // 根据选中信息设置中心坐标
  useAsyncEffect(async () => {
    
    if(!map) {
      return;
    }

    const selectAddress = activeRecord?.getCellValueString(addressFieldId);
  
    let lnglat;
    let position;
    try {
      if(addressType === 'latlng'){
        lnglat = selectAddress ? selectAddress.split(',') : '';
        position = lnglat !== '' ? new AMap.LngLat(lnglat[0], lnglat[1]) : null;
      } else {
         lnglat = await getLocationAsync(plugins, selectAddress);
         position = lnglat ? [lnglat.lng, lnglat.lat] : null;
      }
    
      map.setCenter(position);
    } catch(e) {
    } 
  }, [activeCell, map]);

  // 监听地图的zooms改变
  // useEffect(() => {
  //   if(!map) {
  //     return;
  //   }
  //   map.on('zoomchange', e =>{
  //       const zoom =  map.getZoom();
  //       const label = document.getElementsByClassName('amap-marker-label');
  //       const labelArr = Object.keys(label);
  //       if(zoom < 12) {
  //         labelArr.forEach(item=> {
  //           label[item].style.visibility = 'hidden';
  //         });
  //       } else {
  //         labelArr.forEach(item=> {
  //           label[item].style.visibility = 'visible';
  //         });
  //       }
  //   });
  // },[map]);

  // 设置搜索定位功能
  useEffect(() => {
    if(!plugins || !plugins.autoComplete) {
      return;
    }
    plugins.autoComplete.clearEvents("select");
    plugins.autoComplete.on("select", select);
  }, [plugins, map, debouncedSearchKey]);

  function select(e) {
      setSearchKey(e.poi.name);
      //创建标点 并且设置为地图中心
      if(markerCenterLayer) {
        map.remove(markerCenterLayer);
      } 
      const selectIcon = new AMap.Icon({ 
        ...iconDefaultConfig,
        image: markerSelectedIcon,
      });
      const centerMarker = new AMap.Marker({
        icon: selectIcon,
        //...其他Marker选项...，不包括content
        map: map,
        anchor: 'bottom-center',
        label: {
          content: e.poi.name
        },
        position: [e.poi.location.lng, e.poi.location.lat]
      });
      
      setMarkerCenterLayer(centerMarker);
      map.setCenter([ e.poi.location.lng, e.poi.location.lat]);
  };

  // 地址处理
  async function dealAddress(simpleRecords) {

    const defaultIcon = new AMap.Icon({
      ...iconDefaultConfig,
      image: markerIcon,  // Icon的图像
    });
    let locationRecoreds;
      if(addressType === 'text') {
        
        locationRecoreds  =  await Promise.all(simpleRecords.map(async record => {
          
          if(record && record.className) {
            const recordData = record.getExtData();
            if(recordData.isAddressUpdate) {
              
              map.remove(record);
              const recordLocation = await getRcoresLocationAsync(plugins, { ...recordData, isAddressUpdate: false });
              return creatMarker(expandRecord, recordLocation, defaultIcon);
            } else if (recordData.isTitleUpdate){
              
              map.remove(record);
              return creatMarker(expandRecord, { ...recordData, isTitleUpdate: false }, defaultIcon);
            } else {
              return record;
            }
          } else  {
            const recordLocation = await getRcoresLocationAsync(plugins, { ...record, isAddressUpdate: false });
            return creatMarker(expandRecord, recordLocation, defaultIcon);
          }
        }));
       
      } else if(addressType === 'latlng') {
        locationRecoreds = simpleRecords.map( record => {
          if(record && record.className) {
            const recordData = record.getExtData();
            const lnglat = recordData.address ? recordData.address.split(',') : '';
            if(recordData.isAddressUpdate) {
              map.remove(record);
              let location;
              try {
                location = lnglat && lnglat.length > 1 ? new AMap.LngLat(lnglat[0], lnglat[1]) : null;
              } catch(e) {
                location = null
                // console.log(e);
              }
              return creatMarker(expandRecord, {
                ...recordData,
                location,
                isAddressUpdate: false,
              }, defaultIcon);
            } else if (recordData.isTitleUpdate){
              map.remove(record);
              return creatMarker(expandRecord, {
                ...recordData,
                location,
                isAddressUpdate: false,
              }, defaultIcon);
            } else {
              return record;
            }
          } else {
            const lnglat = record.address ? record.address.split(',') : '';
            let location;
            try {
              location = lnglat && lnglat.length > 1 ? new AMap.LngLat(lnglat[0], lnglat[1]) : null;
            } catch(e) {
              location = null
              // console.log(e);
            }
            return creatMarker(expandRecord, {
              ...record,
              location,
              isAddressUpdate: false,
            }, defaultIcon);
          }
          
        });
      }
      return locationRecoreds.filter(Boolean);
  }

  // 配置改动直接全部更新
  useAsyncEffect(async () => {
    console.log('配置信息', addressType, addressFieldId, lodingStatus);
    if(!addressType || !addressFieldId || !records || !lodingStatus) {
      return;
    }
    if(markersLayer) {
      map.remove(markersLayer);
    }

    const simpleRecords: ISimpleRecords[] = slice(records, 0, limitRcord)
    .map(record => {
      return {
        title: record.getCellValueString(titleFieldID) || '',
        address: record.getCellValueString(addressFieldId) || '',
        id: record.id,
        isAddressUpdate: true,
        isTitleUpdate: true,
      }
    });
    const locationRecoreds = await dealAddress(simpleRecords);
    setMakerslayer(locationRecoreds);
  }, [updateMap, addressFieldId, addressType, titleFieldID, lodingStatus ]);


  // records改动地址名称字段处理存入markersLayer 增删减更新
  useAsyncEffect(async function getAddressList() {
    if(!addressType || !addressFieldId || !records || !lodingStatus) {
      return;
    }
    // 点击更新地图之后根据如果是地址字段去对比cloudStorage储存的信息
    // 获取表格所有地址以及用户选择的名称
   
    const simpleRecords: ISimpleRecords[] = slice(records, 0, limitRcord)
    .map(record => {
      return {
        title: record.getCellValueString(titleFieldID) || '',
        address: record.getCellValueString(addressFieldId) || '',
        id: record.id,
        isAddressUpdate: false,
        isTitleUpdate: false,
      }
    });
    if(!markersLayer || markersLayer.length === 0) { // 如果是第一次设置地图
      
      const locationRecoreds = await dealAddress(simpleRecords);
      
      setMakerslayer(locationRecoreds);
    } else {
      
      const newAddressRecord = updateMardkAddressRecord(simpleRecords, markersLayer);
      
      const dealAddressRecordsCopy = await dealAddress(newAddressRecord);
      setMakerslayer(dealAddressRecordsCopy);
    }
  },[records]);

 
  /* 创建标记点 
  record: 标点信息
  markerConfig: 标点参数配置
  transfer: 创建路径对象
  */
  function creatMarker(
    expandRecord: (expandRecordParams: IExpandRecord) => void,
    record: any, 
    icon: any,
  ) {
    if(!record.location) {
      return;
    }
    const marker =  new AMap.Marker({
      icon,
      //...其他Marker选项...，不包括content
      // title: record.title,
      map: map,
      // label: { 
      //   content: record.title,
      //   direction: 'right'
      // },
      anchor: 'bottom-center',
      clickable: true,
      position: record.location,
      extData: {
        ...record
      }
    });
    

    marker.on('click', () => {
      expandRecord({recordIds: [record.id]});
    });

    marker.on('mouseover', () => {
      infoWindow.setContent(`<div class="infowindowContent" >${record.title}</div>`)
      infoWindow.open(map, record.location);
    });
    
    marker.on('mouseout', () => {
      infoWindow.close(map);
    });

    return marker;
  }


  return (
    <div style={{ width: '100%', height: '100%' }}>
      <div id="mapContainer" style={{ width: '100%', height: '100%' }}>
          <div className={styles.searchContent}>
              <div className={styles.searchBlock}>
                <TextInput
                  className={styles.searchInput}
                  placeholder="请输入内容"
                  size="small"
                  id="searchInput"
                  value={searchKey}
                  onChange={ e => setSearchKey(e.target.value)}
                  block
                  suffix={<SearchOutlined />}
                />
              </div>
          </div>
          <div className={styles.toolBar}>
            <ZoomInOutlined size={16} className={styles.tooBarIcon}  onClick={() => { map.zoomIn() }} />
            <ZoomOutOutlined size={16} className={styles.tooBarIcon} onClick={() => { map.zoomOut() }} />
          </div>
      </div>
    </div>
  );
}