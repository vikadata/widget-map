import React, { useState, useEffect } from 'react';
import { useCloudStorage, useRecords, useExpandRecord, IExpandRecord, useActiveCell, useRecord } from '@vikadata/widget-sdk';
import { getLocationArrayAsync } from '../../utils/common';
import { useDebounce } from 'ahooks';
import { TextInput } from '@vikadata/components';
import styles from './style.module.less';
import { SearchOutlined } from '@vikadata/icons';

interface mapContentProps {
  pluginStatus: boolean
}

interface markConfig {
  iconStyle: string,  //背景图标样式
  iconLabel: string,  //前景文字 
  iconTheme: string, //图标主题 
}

const conterMarkerConfig = {
  iconLabel: '',
  iconStyle: 'orange',
  iconTheme: 'fresh'
}

const homeMarkerConfig = {
  iconLabel: '',
  iconStyle: 'lightgreen',
  iconTheme: 'fresh'
}

export const MapContent: React.FC<mapContentProps> = ({ pluginStatus  }) => {
  // 获取表格视图ID
  const [viewId] = useCloudStorage<string>('selectedViewId');
  // 获取所有行的信息
  const records = useRecords(viewId);

  // 处理完的表格信息
  const [recordsData, setRecordsdata] = useState<any>();
  const expandRecord = useExpandRecord();

  // 中心标点
  const [markerCenterLayer, setMarkerCenterLayer] = useState<any>();
  // 地图标点集合
  const [markersLayer, setMakerslayer] = useState<any>(null);

  // 搜索输入
  const [searchKey, setSearchKey] = useState<string>();
  const debouncedSearchKey = useDebounce(searchKey, { wait: 500 });

  // 地址类型
  const [addressType] = useCloudStorage<string | number>('addressType', 'text');
  // 地址字段ID
  const [addressFieldId] = useCloudStorage<string>('address');
  // 名称字段ID
  const [titleFieldID] = useCloudStorage<string>('title');

  // 获取表格选中信息
  const activeCell = useActiveCell();
  const activeRecord = useRecord(activeCell?.recordId);

  useEffect(() => {
    console.log('选中信息', activeRecord?.getCellValueString(addressFieldId));
    const selectAddress = activeRecord?.getCellValueString(addressFieldId);
    const lnglat = selectAddress ? selectAddress.split(',') : '';
    try {
      console.log('lnglat', lnglat);
      const position = lnglat !== '' ? new window.AMap.LngLat(lnglat[0], lnglat[1]) : null;
      window.amap.setCenter(position);
    } catch(e) {
      console.log(e);
    } 
  }, [activeCell, window.amap]);

  // 设置搜索定位功能
  useEffect(() => {
    if(!window.AutoComplete) {
      return;
    }
    window.AutoComplete.clearEvents("select");
    window.AutoComplete.on("select", select);
  }, [window.AutoComplete, window.amap, debouncedSearchKey]);

  function select(e) {
      setSearchKey(e.poi.name);
      //创建标点 并且设置为地图中心
      
      if(markerCenterLayer) {
        window.amap.remove(markerCenterLayer);
      } 
      const centerMarker = new window.AMapUI.SimpleMarker({
        ...conterMarkerConfig,
        //...其他Marker选项...，不包括content
        map: window.amap,
        clickable: true,
        position: [e.poi.location.lng, e.poi.location.lat]
      });
      setMarkerCenterLayer(centerMarker);
      window.amap.setCenter([ e.poi.location.lng, e.poi.location.lat]);
  };

  // 地址处理
  useEffect(function getAddressList() {
    if(!addressType || !addressFieldId) {
      return;
    }  
    // 获取表格所有地址
    const recordsData: any[] = records
      .map(record => {
        return {
          title: record.getCellValueString(titleFieldID) || '',
          address: record.getCellValueString(addressFieldId) || '',
          id: record.id,
        }
      });
    console.log('recordsData----->', recordsData);
    setRecordsdata(recordsData);
  },[records, addressFieldId, addressType, titleFieldID]);

  // 创建中心点坐标
  useEffect(function setCenter(){
    if(!window.amap || !pluginStatus) {
      return;
    }
    if(markerCenterLayer) {
      window.amap.remove(markerCenterLayer);
    } 
  },[window.amap, pluginStatus]);
 
  // 根据表格设置所有地图点
  useEffect(function drawAddress() {
    if (!pluginStatus || !recordsData) {
      return;
    }
    markAddress(recordsData, markersLayer, expandRecord);
  }, [recordsData, pluginStatus]);

  /* 创建标记点 
  record: 标点信息
  markerConfig: 标点参数配置
  transfer: 创建路径对象
  */
  function creatMarker(
    expandRecord: (expandRecordParams: IExpandRecord) => void,
    record: any, 
    markerConfig: markConfig,
  ) {
    if(!record.location) {
      return;
    }
    const marker =  new window.AMapUI.SimpleMarker({
      ...markerConfig,
      title: record.title,
      //...其他Marker选项...，不包括content
      map: window.amap,
      clickable: true,
      position: [record.location.lng, record.location.lat]
    });
    

    marker.on('click', () => {
      expandRecord({recordIds: [record.id]});
    });
    
    return marker;
  }

  /* 根据地址搜索增加marker点 
  recordsData: 表格数据
  markersLayer: 之前已经创建的marker图层
  expandRecord: 展开卡片函数
  */
  async function markAddress( 
    recordsData: Array<any>, 
    markersLayer: Array<any>,
    expandRecord: (expandRecordParams: IExpandRecord) => void
  ) {
      

      if(markersLayer) {
        window.amap.remove(markersLayer);
      }
      let recordsRes;
      

      if(addressType === 'text') {
        const recordsAddress = recordsData.map(record => record.address).filter(Boolean);

        const locationList : any = await getLocationArrayAsync(recordsAddress);

        console.log('locationList', locationList);
        recordsRes = locationList.map((item, index) => {
            return {
              location: item ? { lng: item.location.lng, lat: item.location.lat} : null,
              ...recordsData[index]
            }
        });
        // const asyncRecords = recordsData.map(record => getLocationAsync(record));
        // recordsRes = await Promise.all(asyncRecords);
      } else if(addressType === 'latlng') {
        recordsRes = recordsData.map( record => {
          const lonlat = record.address ? record.address.split(',') : '';
          
          let location;
          try {
            location = lonlat !== '' ? new window.AMap.LngLat(lonlat[0], lonlat[1]) : null;
          } catch(e) {
            location = null
            console.log(e)
          }
          return {
            location,
            ...record,
          }
      });
    }
    
    const markers = recordsRes && recordsRes.map((record: any) => { 
      return creatMarker(expandRecord, record, homeMarkerConfig);
    }).filter(x => x);
    
    const cluster = new window.AMap.MarkerClusterer(window.amap, markers);
    console.log(cluster);
    setMakerslayer(markers);
  }

  return (
    <div style={{ width: '100%', height: '100%' }}>
      <div id="container" style={{ width: '100%', height: '100%' }}>
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
                />
              </div>
              <div className={styles.searchIcon}>
                  <SearchOutlined color="#FFFFFF" />
              </div>
          </div>
      </div>
    </div>
  );
}