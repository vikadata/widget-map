import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useCloudStorage, useRecords, useExpandRecord, useActiveCell, useRecord, useFields, useActiveViewId, useViewIds } from '@vikadata/widget-sdk';
import { getLocationAsync, getCoordinateRecords, updateMardkAddressRecord } from '../../utils/amap_api';
import { useDebounce, useRequest } from 'ahooks';
import { TextInput, Message, Tooltip, Button } from '@vikadata/components';
import styles from './style.module.less';
import { SearchOutlined, ZoomOutOutlined, ZoomInOutlined, EyeNormalOutlined, EyeCloseOutlined, PositionOutlined, DefaultFilled, CloseLargeOutlined} from '@vikadata/icons';
import { creatIconLayer, creatLabelLayer } from '../../utils/common';
import { useAsyncEffect } from '../../utils/hooks';
import { getGeoJson } from '../../utils/tools';
import markerIcon from '../../static/img/mark.svg';
import markerSelectedIcon from '../../static/img/markSelect.svg';
import { IPlugins, ISimpleRecords } from '../../interface/map';
import "@amap/amap-jsapi-types";
import { Strings, t } from '../../i18n';
import { slice } from 'lodash';
import { message as messageAntd } from 'antd';

interface IMapContentProps {
  lodingStatus: boolean,
  AMap: any,
  map: any, // 地图实例
  plugins: IPlugins | undefined
}

export const MapContent: React.FC<IMapContentProps> = props => {

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
  
  // 地图标点集合
  const [iconLayer, setIconlayer] = useState<AMap.Marker[]>();
 
  // 标点label图层
  const [isShowLabel, setIsShowLabel] = useState<boolean>(false);
  const labelLayer = useRef();

  // 可视化容器
  const [localContainer, setLocalContainer] = useState<any>();

  const [textCoordinateRecordsCache, setTextCoordinateRecordsCache ] = useCloudStorage<ISimpleRecords[]>('textCoordinateRecordsCache', []);
  
  const [isSetTextCache, setIsSetTextCache] = useCloudStorage<boolean>('isSetTextCache', false);

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
      offset: [0, -32],
      isCustom: true,
      // anchor: 'middle-left'
    }) : null;
  }, [AMap, lodingStatus]);
  
  
  
  
  const canvas = document.createElement('canvas');

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
    if(!map || !labelLayer.current) {
      return;
    }
    
    if(!isShowLabel) {
      labelLayer.current.setOpacity(0);
    } else {
      labelLayer.current.setOpacity(1);
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

  const updateTextCache = (mapRecords: ISimpleRecords) => {
    const newCache =  updateMardkAddressRecord( mapRecords,textCoordinateRecordsCache);
    setTextCoordinateRecordsCache(newCache);
    setIsSetTextCache(true);
  }

  useEffect(() => {
    if(isSetTextCache) {
      messageAntd.destroy();
    }
  }, [isSetTextCache]);

  const closeMessage = () => {
    messageAntd.destroy();
  }

  const updateMap = async (plugins, records) => {
    if(!plugins) {
      return;
    }
    
     // 限制加载标点数量
     const mapRecords =  slice(records, 0 , 2000).map(record => {
      return {
        title: record.getCellValueString(titleFieldID) || '',
        address: record.getCellValueString(addressFieldId) || '',
        id: record.id,
        isAddressUpdate: true
      }
    });

    
    if(addressType === 'text' && !isSetTextCache) {
      messageAntd.info({
        icon: <DefaultFilled size={16} />,
        content: ( 
          <div className={styles.antdMessageContent}>
            <span>检测到表格内的数据有更新，你可以选择重新加载地图</span>
            <span className={styles.antdMessageButton} onClick={() => updateTextCache(mapRecords)} >重新加载</span>
            <CloseLargeOutlined onClick={() => closeMessage()} className={styles.antdMessageCloseButton} size={10}/>
          </div>
        ),
        key: 'loadTextDataMessage',
        duration: 0
      });

      return;
    }

    if(iconLayer) {
      localContainer?.remove(iconLayer);
      map.remove(localContainer);
    }

    if(labelLayer.current) {
      labelLayer.current.destroy();
      map.remove(labelLayer.current);
    }

   

    Message.success({ content: t(Strings.map_loading), messageKey: "loadingMark", duration: 0 });

    return getCoordinateRecords(plugins, addressType, textCoordinateRecordsCache, mapRecords);
  };

  // 配置切换更新
  const { data, } = useRequest(() => updateMap(plugins, records), {
    debounceWait: 500,
    refreshDeps: [records, plugins, addressFieldId, addressType, titleFieldID, lodingStatus, textCoordinateRecordsCache]
  });
 

  useEffect(() => {
    if(!plugins || !data) {
      return;
    }
   
    if(addressType === 'text' && isSetTextCache) {
      setIsSetTextCache(false);
    }

    // 创建icon图层
    const recordsGeo = getGeoJson(data);
    const newIconLayer = creatIconLayer(map, plugins, expandRecord, markerIcon, infoWindow, recordsGeo);
    const loca = new plugins.Loca.Container({
      map,
    });
    loca.add(newIconLayer);
    setLocalContainer(loca);
    setIconlayer(newIconLayer);

    // 创建label图层
    const newLabelLayer = creatLabelLayer(map, canvas, AMap, AMap, data);
    labelLayer.current = newLabelLayer;

    Message.success({ 
      content: `${t(Strings.map_loading_complte1)}${recordsGeo.length}${t(Strings.map_loading_complte2)}`,
      messageKey: "loadingMark", 
      duration: 3 
    });
   
  }, [data]);

  
 
  const backLocation = (plugins) => {
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
                  placeholder={t(Strings.enter_info)}
                  size="small"
                  id="searchInput"
                  value={searchKey}
                  onChange={ e => setSearchKey(e.target.value)}
                  block
                  suffix={<SearchOutlined />}
                />
              </div>
          </div>
          <Tooltip content={isShowLabel ? t(Strings.hide_address_name) : t(Strings.show_address_name)} placement='left'>
            <div className={styles.labelControl} >
                { isShowLabel ? <EyeNormalOutlined size={16} className={styles.tooBarIcon} onClick={() => setIsShowLabel(!isShowLabel)}   /> : 
                <EyeCloseOutlined size={16} className={styles.tooBarIcon} onClick={() => setIsShowLabel(!isShowLabel)} /> }
            </div>
          </Tooltip>
          <Tooltip content={t(Strings.location_city)} placement='left'>
            <div className={styles.backPosition} >
              <PositionOutlined size={16} className={styles.tooBarIcon} onClick={() => backLocation(plugins)} />
            </div>
          </Tooltip>
          <div className={styles.toolBar}>
            <ZoomInOutlined size={16} className={styles.tooBarIcon}  onClick={() => { map.zoomIn() }} />
            <ZoomOutOutlined size={16} className={styles.tooBarIcon} onClick={() => { map.zoomOut() }} />
          </div>
        </div>
    </div>
  );
}