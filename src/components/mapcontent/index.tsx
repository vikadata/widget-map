import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useCloudStorage, useRecords, useExpandRecord, useActiveCell, useRecord, useFields, useActiveViewId, useViewIds } from '@vikadata/widget-sdk';
import { getLocationAsync, getRcoresLocationAsync, updateMardkAddressRecord } from '../../utils/common';
import { useDebounce, useRequest } from 'ahooks';
import { TextInput, Message, Tooltip } from '@vikadata/components';
import styles from './style.module.less';
import { SearchOutlined, ZoomOutOutlined, ZoomInOutlined, EyeNormalOutlined, EyeCloseOutlined, PositionOutlined } from '@vikadata/icons';

import { useAsyncEffect } from '../../utils/hooks';
import markerIcon from '../../static/img/mark.svg';
import markerSelectedIcon from '../../static/img/markSelect.svg';
import { IPlugins, ISimpleRecords } from '../../interface/map';
import "@amap/amap-jsapi-types";

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

  const [textLocationCache, setTextLocationCache ] = useCloudStorage<ISimpleRecords[]>('textLocationCache', []);
  


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

  // 地址处理
  async function dealAddress(plugins: IPlugins | undefined, records: any) {
    
    
    if(!plugins) {
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

    Message.success({ content: `地图正在加载中，请稍后`, messageKey: "loadingMark", duration: 0 });
    const simpleRecords: ISimpleRecords[] = records.map(record => {
      return {
        title: record.getCellValueString(titleFieldID) || '',
        address: record.getCellValueString(addressFieldId) || '',
        id: record.id,
        isAddressUpdate: true
      }
    });
  
    return new Promise<ISimpleRecords[]>(async (resolve, reject) => {
      if(addressType === 'text') {
        let newRecords = simpleRecords;
        if(textLocationCache && textLocationCache.length > 0) { 
          newRecords = updateMardkAddressRecord(simpleRecords, textLocationCache);
        }
        const asyncRecords = newRecords.map(async record => {
          if(record.isAddressUpdate) {
            return getRcoresLocationAsync(plugins, record);
          } else {
            return record
          }
        });
        const res  = await Promise.all(asyncRecords) as ISimpleRecords[];
        resolve(res);
      } else if(addressType === 'latlng') {
        const res = simpleRecords.map(record => {
          const location = record.address ? record.address.split(',') : '';
          if(!location || location.length !== 2 || isNaN(parseFloat(location[0])) ||  isNaN(parseFloat(location[0]))) {
            return null;
          } else {
            return {
              ...record,
              location: [
                  parseFloat(location[0]).toFixed(6), parseFloat(location[1]).toFixed(6)
              ]
            }
          }
        }).filter(Boolean) as ISimpleRecords[];
        console.log('res---->', res);
        resolve(res);
      }
    });
    
  }

  // 配置切换更新
  const { data } = useRequest(() => dealAddress(plugins, records), {
    debounceWait: 500,
    refreshDeps: [records, plugins, addressFieldId, addressType, titleFieldID, lodingStatus]
  });
 

  useEffect(() => {
    console.log('data---->', data);
    if(!plugins || !data) {
      return;
    }
   

    if(addressType === 'text') {
      setTextLocationCache(data);
    }
    const recordsGeo = formateGeo(data);
    const newIconLayer = creatIconLayer(plugins, recordsGeo);
    const loca = new plugins.Loca.Container({
      map,
    });
    loca.add(newIconLayer);
    setLocalContainer(loca);
    setIconlayer(newIconLayer);
    Message.success({ content: `地图加载完成，一共显示了${recordsGeo.length}个地址`, messageKey: "loadingMark", duration: 3 });
    const newLabelLayer = creatLabelLayer(data);
    
    labelLayer.current = newLabelLayer;
  }, [data]);



  function formateGeo(locationRecords) {
    return locationRecords.map(record => {
        if(!record.location) {
          return null
        }
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
    
    const iconLayer = new plugins.Loca.IconLayer({
      zIndex: 50,
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
      offset: [0,15],
    });

  
    //点击展开弹窗
    map.on('click', (e) => {
        const feat = iconLayer.queryFeature(e.pixel.toArray());
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

    return iconLayer;
  }
  
  function creatLabelLayer(locationRecords) {
    
    canvas.id = 'labelCanvas';
    const customLabelLayer = new AMap.CustomLayer(canvas, {
      zooms: [3, 20],
      zIndex: 12,
    });
    

		const onRender = function(){
      
        // customLabelLayer.hide();
		    const retina = AMap.Browser.retina;
        const size = map.getSize();//resize
        let width = size.width;
        let height = size.height;
        canvas.style.width = width+'px'
        canvas.style.height = height+'px'
        if(retina){//高清适配
            width*=2;
            height*=2;
        }
        canvas.width = width;
        canvas.height = height;//清除画布
		    const ctx = canvas.getContext("2d");
        if(!ctx) {
          return;
        }
    		
    		ctx.strokeStyle = '#DCDFE5';
    		ctx.beginPath();
        ctx.font = "14px PingFang SC";
        
        locationRecords.forEach(locationRecord => {
          const center = locationRecord.location;
          if(!center) {
            return
          }
    			let pos = map.lngLatToContainer(center);
          const title = locationRecord.title.length < 9 ? locationRecord.title : locationRecord.title.substring(0,7) + '...';
    			const text = ctx.measureText(title);
    			if(retina){
    			    pos = pos.multiplyBy(2);
    			}
    			ctx.moveTo(pos.x, pos.y);
          ctx.fillStyle = '#fff';
    		  ctx.fillRect(pos.x + 20, pos.y - 30, text.width + 16, 32);
          ctx.fillStyle = "#2E2E2E";
          ctx.fillText(title, pos.x + 28, pos.y - 10, 164);
        });
		 
    		ctx.lineWidth = retina? 6 : 3;
    		ctx.closePath();
    		ctx.stroke();
    		ctx.fill();
		}
		customLabelLayer.render = onRender;
		customLabelLayer.setMap(map);
    if(isShowLabel) {
      customLabelLayer.setOpacity(1);
    } else {
      customLabelLayer.setOpacity(0);
    }
    return customLabelLayer;
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
          <Tooltip content='回到当前城市' placement='left'>
            <div className={styles.backPosition}  >
              <PositionOutlined size={16} className={styles.tooBarIcon} onClick={backLocation} />
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