import React, { useState, useEffect, useMemo } from 'react';
import { useCloudStorage, useRecords, useExpandRecord, IExpandRecord, useActiveCell, useRecord, useFields, useActiveViewId, useViewIds } from '@vikadata/widget-sdk';
import { getLocationAsync, getRcoresLocationAsync } from '../../utils/common';
import { useDebounce } from 'ahooks';
import { TextInput, Message, Tooltip } from '@vikadata/components';
import styles from './style.module.less';
import { SearchOutlined, ZoomOutOutlined, ZoomInOutlined, EyeNormalOutlined, EyeCloseOutlined, PositionOutlined } from '@vikadata/icons';

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
const limitRcord = 50000;


const labelStyle = {
  // 字体大小
  fontSize: 14,
  // 字体颜色
  fillColor: '#2E2E2E',
  fontStyle: 'normal',
  fontFamily: 'PingFang SC',
  fontWeight: '400',
  padding: '5, 8',
  backgroundColor: '#FFFFFF',
  borderColor: '#DCDFE5',
  borderWidth: 1,
 
  borderRadius: 4
}


export const MapContent: React.FC<mapContentProps> = props => {

  const { lodingStatus, map, AMap, plugins} = props;
  // useActiveViewId 存在在仪表盘下新建获取为空，所以需要拿到所有表的第一个
  const defaultViewId = useActiveViewId() || useViewIds()[0];
  const defaultFields = useFields(defaultViewId);
  // 获取表格视图ID
  const [viewId] = useCloudStorage<string>('selectedViewId', defaultViewId);
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
  const [titleFieldID] = useCloudStorage<string>('title', defaultFields[0].fieldData.id);
 
  // 获取表格选中信息
  const activeCell = useActiveCell();
  const activeRecord = useRecord(activeCell?.recordId);
  const [updateMap] = useCloudStorage<boolean>('updateMap');

  // 地图标点集合
  const [markersLayer, setMakerslayer] = useState<AMap.Marker[]>();
 
  // 标点label集合
  const [isShowLabel, setIsShowLabel] = useState<boolean>(true);
  const [laberMarker, setLabelMarker] = useState();
  
  // 可视化容器
  const [localContainer, setLocalContainer] = useState<any>();

  // 默认Icon 配置
  const iconDefaultConfig = useMemo(() => {
      return lodingStatus ? {
        type: 'image',
        image: markerIcon,
        anchor:'center',
      } : null;
  }, [AMap, lodingStatus]);
  
  // 默认信息弹窗配置
  const infoWindow =  useMemo(() => { 
    return lodingStatus ? new AMap.InfoWindow({
      content: '<div class="infowindowContent" ></div>',  //传入 dom 对象，或者 html 字符串
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
   
    if(!isShowLabel ) {
      map.remove(laberMarker);
    } else {
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
  async function dealAddress(plugins, records) {
      if(addressType === 'text') {
        const asyncRecords = records.map(record => getRcoresLocationAsync(plugins, record));
        return Promise.all(asyncRecords);
      } else if(addressType === 'latlng') {
        return records.map(record => {
          const location = record.address ? record.address.split(',') : '';
          if(!location || location.length !== 2) {
            return null;
          } else {
            return {
              ...record,
              location: [
                  parseFloat(location[0]).toFixed(6), parseFloat(location[1]).toFixed(6)
              ]
            }
          }
        }).filter(Boolean);
      }
  }




  // 配置改动直接全部更新
  useAsyncEffect(async () => {
 
    if(!addressType || !addressFieldId || !records || !lodingStatus) {
      return;
    }
    if(markersLayer) {
      localContainer?.remove(markersLayer);
    }

    if(laberMarker) {
      map.remove(laberMarker);
    }

    const simpleRecords: ISimpleRecords[] = records.map(record => {
      return {
        title: record.getCellValueString(titleFieldID) || '',
        address: record.getCellValueString(addressFieldId) || '',
        id: record.id,
        isAddressUpdate: true,
        isTitleUpdate: true,
      }
    });

    map.setZoom(4);

    //经纬度处理
    const locationRecords = await dealAddress(plugins, simpleRecords);

    console.log('locationRecords', locationRecords);

    const recordsGeo = formateGeo(locationRecords);

    const [local, iconLayer] = creatIconLayer(plugins, recordsGeo);
    setLocalContainer(local);
    setMakerslayer(iconLayer);
    Message.success({ content: `图标渲染完成 渲染数目${locationRecords.length}` });
    const labelLayer = creatLabelLayer(recordsGeo);
    setLabelMarker(labelLayer);
    

  }, [updateMap, addressFieldId, addressType, titleFieldID, lodingStatus ]);


  function formateGeo(records) {
    return records.map(record => { 
        return {
          "type": "Feature",
          "properties": {
              "title": record.title,
              "id": record.id,
              "address": record.address
          },
          "geometry": {
              "type": "Point",
              "coordinates": record.location
          }
        }
    }).filter(Boolean);
  }

  // 创建icon标点图层
  function creatIconLayer(plugins, geoRecords) {
    
    const loca = new plugins.Loca.Container({
      map,
    });

    const iconLayer = new plugins.Loca.IconLayer({
      zIndex: 99,
      opacity: 1,
      visible: true,
    });
    
    const geo = new plugins.Loca.GeoJSONSource({
      data: {
          "type": "FeatureCollection",
          "features": geoRecords,
      },
    });
    
    iconLayer.setSource(geo);

    iconLayer.setStyle({
      unit: 'px',
      icon: markerIcon,
      iconSize: [30,30],
      rotation: 0,
    });

    loca.add(iconLayer);

  
    //点击展开弹窗
    map.on('click', (e) => {
        const feat = iconLayer.queryFeature(e.pixel.toArray());
        console.log('feat', feat);
        if (feat) {
            expandRecord({recordIds: [feat.properties.id]});
        }
    });

    // 显示信息弹窗
    map.on('mousemove', (e) => {
      const feat = iconLayer.queryFeature(e.pixel.toArray());
      if(feat) {
        infoWindow.setContent(`<div class="infowindowContent" ><h1>${feat.properties.title}</h1><p>${feat.properties.address}</p></div>`)
        infoWindow.open(map, feat.coordinates);
      } else {
        infoWindow.close(map);
      }
    });

   

    return [loca, iconLayer];
  }
  
  function creatLabelLayer(geoRecords) {
    // 标点的label
    const labelMarkers = geoRecords.map(record => {
     const text = {
        // 要展示的文字内容
        content: record?.properties.title,
        // 文字方向，有 icon 时为围绕文字的方向，没有 icon 时，则为相对 position 的位置
        direction: 'right',
        // 在 direction 基础上的偏移量
        offset: [20, 0],
        // 文字样式
        style: labelStyle
      }

      return  new AMap.LabelMarker({
          name: 'Label', // 此属性非绘制文字内容，仅最为标识使用
          position: record?.geometry.coordinates,
          zIndex: 16,
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
    map.add(labelsLayer);
    return labelsLayer;
  }
 
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
    const marker =  new AMap.LabelMarker({
      icon,
      //...其他Marker选项...，不包括content
      // title: record.title,
      text: { 
        content: record.title,
        direction: 'right',
        fontSize: 14,
        fillColor: '#2E2E2E',
        fold: true
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

  function backLocation(plugins) {
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
    <div style={{ width: '100%', height: '100%', position: 'relative' }}>
      <div id="mapContainer" style={{ width: '100%', height: '100%', position: 'relative' }}>
      </div>
      <div>
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
            <PositionOutlined size={16} className={styles.tooBarIcon} />
          </div>
          <div className={styles.toolBar}>
            <ZoomInOutlined size={16} className={styles.tooBarIcon}  onClick={() => { map.zoomIn() }} />
            <ZoomOutOutlined size={16} className={styles.tooBarIcon} onClick={() => { map.zoomOut() }} />
          </div>
        </div>
    </div>
  );
}