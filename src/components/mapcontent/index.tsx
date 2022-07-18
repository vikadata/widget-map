import React, { useState, useEffect, useMemo } from 'react';
import { useCloudStorage, useRecords, useExpandRecord, IExpandRecord, useActiveCell, useRecord } from '@vikadata/widget-sdk';
import { getLocationAsync, getRcoresLocationAsync, updateMardkAddressRecord } from '../../utils/common';
import { useDebounce } from 'ahooks';
import { TextInput, Message, Tooltip, colorVars } from '@vikadata/components';
import styles from './style.module.less';
import { SearchOutlined, ZoomOutOutlined, ZoomInOutlined, EyeNormalOutlined, EyeCloseOutlined, TitleTemplateFilled } from '@vikadata/icons';

import { useAsyncEffect } from '../../utils/hooks';
import markerIcon from '../../static/img/mark.svg';
import markerSelectedIcon from '../../static/img/markSelect.svg';
import labelBg from '../../static/img/label_bg.svg';
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
  const [markerCenterLayer, setMarkerCenterLayer] = useState<AMap.Marker>();
  
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
  
  const [isShowLabel, setIsShowLabel] = useState<boolean>(true);
  const [laberMarker, setLabelMarker] = useState();
  
  // 默认Icon 配置
  const iconDefaultConfig = useMemo(() => {
      return lodingStatus ? {
        image: markerIcon,
        anchor:'center',
        // imageSize: new AMap.Size(22, 22),   // 根据所设置的大小拉伸或压缩图片
      } : null;
  }, [AMap, lodingStatus]);
  
  // 默认信息弹窗配置
  const infoWindow =  useMemo(() => { 
    return lodingStatus ? new AMap.InfoWindow({
      content: '<div class="infowindowContent" >11111</div>',  //传入 dom 对象，或者 html 字符串
      offset: [0, -22],
      isCustom: true,
      // anchor: 'middle-left'
    }) : null;
  }, [AMap, lodingStatus]);

  
  
  

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
    
      map.setCenter(position, true);
    } catch(e) {
    } 
  }, [activeCell, map]);

  // 切换Label
  useEffect(() => {
    if(!map || !laberMarker) {
      return;
    }
    // const label = document.getElementsByClassName('amap-marker-label');
    // const labelArr = Object.keys(label);
    if(!isShowLabel ) {
      // labelArr.forEach(item=> {
      //   label[item].style.visibility = 'hidden';
      // });
      map.remove(laberMarker);
    } else {
      // labelArr.forEach(item=> {
      //   label[item].style.visibility = 'visible';
      // });
      
      map.add(laberMarker);
    }
  
    
  },[map, isShowLabel]);

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
    return;
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
    map.setZoom(4);
    const locationRecoreds = await dealAddress(simpleRecords);
    Message.success({ content: `图标渲染完成 渲染数目${locationRecoreds.length}` });
    
    setMakerslayer(locationRecoreds);
  }, [updateMap, addressFieldId, addressType, titleFieldID, lodingStatus ]);


  // records改动地址名称字段处理存入markersLayer 增删减更新
  useAsyncEffect(async function getAddressList() {
    return;
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
      map.setZoom(4);
      const locationRecoreds = await dealAddress(simpleRecords);
      Message.success({ content: `图标渲染完成 渲染数目${locationRecoreds.length}` });
      setMakerslayer(locationRecoreds);
    } else {
      
      const newAddressRecord = updateMardkAddressRecord(simpleRecords, markersLayer);
      
      const dealAddressRecordsCopy = await dealAddress(newAddressRecord);
      setMakerslayer(dealAddressRecordsCopy);
    }
  },[records]);
  
  useEffect(() => {
    if(!records || !plugins || !map) {
      return;
    }
    const recordsSlice: ISimpleRecords[] = slice(records, 0, 20000)
    .map(record => {
      return {
        title: record.getCellValueString(titleFieldID) || '',
        address: record.getCellValueString(addressFieldId) || '',
        id: record.id,
        isAddressUpdate: true,
        isTitleUpdate: true,
      }
    });
    // console.log('recordsSlice--->', recordsSlice);

    const recordsGeo = recordsSlice.map(record => {
      const location = record.address ? record.address.split(',') : '';
      if(!location || location.length !== 2) {
       
        return null;
      } else {
        return {
          "type": "Feature",
          "properties": {
              "title": record.title,
              "id": record.id,
              "address": record.address
          },
          "geometry": {
              "type": "Point",
              "coordinates": [
                parseFloat(location[0]).toFixed(6), parseFloat(location[1]).toFixed(6)
            ]
          }
        }
      }
    }).filter(Boolean); 

    console.log('recordsGeo-->', recordsGeo);

    const loca = new plugins.Loca.Container({
        map,
    });
    // console.log('loca---->', loca);

    const layer = new plugins.Loca.IconLayer({
        zIndex: 99,
        opacity: 1,
        visible: true,
    });
    
    const geo = new plugins.Loca.GeoJSONSource({
        data: {
            "type": "FeatureCollection",
            "features": recordsGeo,
        },
    });
    
    layer.setSource(geo);
    layer.setStyle({
      unit: 'px',
      icon: 'https://s1.vika.cn/space/2022/06/16/10106551d68d43699bbad58527e357da?attname=mark.svg',
      iconSize: [30,30],
      // offset: [0, -40],
      rotation: 0,
    })
    loca.add(layer);

  
  
    // 拾取测试
    map.on('click', (e) => {
        const feat = layer.queryFeature(e.pixel.toArray());
        console.log('feat', feat);
        if (feat) {
            expandRecord({recordIds: [feat.properties.id]});
        }
    });

    map.on('mousemove', (e) => {
      const feat = layer.queryFeature(e.pixel.toArray());
      console.log('feat', feat);
      if(feat) {
        infoWindow.setContent(`<div class="infowindowContent" ><h1>${feat.properties.title}</h1><p>${feat.properties.address}</p></div>`)
        infoWindow.open(map, feat.coordinates);
      } else {
        infoWindow.close(map);
      }
    });
    const labelMarkers = recordsGeo.map(record => {
      const text = {
        // 要展示的文字内容
        content: record?.properties.title,
        // 文字方向，有 icon 时为围绕文字的方向，没有 icon 时，则为相对 position 的位置
        direction: 'right',
        // 在 direction 基础上的偏移量
        offset: [20, 0],
        // 文字样式
        style: {
            // 字体大小
            fontSize: 14,
            // 字体颜色
            fillColor: '#2E2E2E',
            fontStyle: 'normal',
            fontFamily: 'PingFang SC',
            fontWeight: '400',
            padding: '5, 8',
            // // 描边颜色
            // strokeColor: '#fff',
            // // 描边宽度
            // strokeWidth: 2,
            backgroundColor: '#FFFFFF',
            borderColor: '#DCDFE5',
            borderWidth: 1,
           
            borderRadius: 4
        }
      }
     
      return  new AMap.LabelMarker({
          name: '标注2', // 此属性非绘制文字内容，仅最为标识使用
          position: record?.geometry.coordinates,
          zIndex: 16,
          // 将第二步创建的 text 对象传给 text 属性
          text: text,

      });
      
    });
    const labelsLayer = new AMap.LabelsLayer({
        zooms: [3, 20],
        zIndex: 120,
        // 该层内标注是否避让
        collision: true,
        // 设置 allowCollision：true，可以让标注避让用户的标注
        allowCollision: true,
    });
    labelsLayer.add(labelMarkers);
    setLabelMarker(labelsLayer);
    map.add(labelsLayer);

    // layer.show();
  }, [records, titleFieldID, updateMap]);
 
  /* 创建标记点 
  record: 标点信息
  markerConfig: 标点参数配置
  transfer: 创建路径对象
  */
  function creatMarker(
    expandRecord: (expandRecordParams: IExpandRecord) => void,
    record: any, 
    icon: AMap.Icon,
  ) {
    if(!record.location) {
      return;
    }
    const marker =  new AMap.Marker({
      icon,
      //...其他Marker选项...，不包括content
      // title: record.title,
      map: map,
      label: { 
        content: record.title,
        direction: 'right'
      },
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
      infoWindow.setContent(`<div class="infowindowContent" ><h1>${record.title}</h1><p>${record.address}</p></div>`)
      infoWindow.open(map, record.location);
    });
    
    marker.on('mouseout', () => {
      infoWindow.close(map);
    });

    return marker;
  }

  function backLocation() {
    if(plugins)
    plugins.citySearch.getLocalCity(function (status, result) {
      if (status === 'complete' && result.info === 'OK') {
        // 查询成功，result即为当前所在城市信息
        const citybounds = result.bounds;
        map.setBounds(citybounds);
      } else{
        Message.error({ content: `定位失败` });
      }
    });
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
          <Tooltip content={isShowLabel ? '隐藏地址名称' : '显示地址名称'} placement='left'>
            <div className={styles.labelControl} >
                { isShowLabel ? <EyeNormalOutlined size={16} className={styles.tooBarIcon} onClick={() => setIsShowLabel(!isShowLabel)}   /> : 
                <EyeCloseOutlined size={16} className={styles.tooBarIcon} onClick={() => setIsShowLabel(!isShowLabel)} /> }
            </div>
          </Tooltip>
          <div className={styles.backPosition} onClick={backLocation} >
             <TitleTemplateFilled size={16} className={styles.tooBarIcon} />
          </div>
          <div className={styles.toolBar}>
            <ZoomInOutlined size={16} className={styles.tooBarIcon}  onClick={() => { map.zoomIn() }} />
            <ZoomOutOutlined size={16} className={styles.tooBarIcon} onClick={() => { map.zoomOut() }} />
          </div>
      </div>
    </div>
  );
}