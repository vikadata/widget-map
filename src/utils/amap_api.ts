import { IPlugins, ISimpleRecords } from '../interface/map';
import { IExpandRecord } from '@vikadata/widget-sdk';

// 根据地址获取去高德地图定位点
export const getLocationAsync = (plugins: IPlugins | undefined, address: any) => {

  if(!plugins) {
    return;
  }

  return new Promise((resolve, reject) => {
   
    if(address) {
      plugins.geocoder.getLocation(address, function(status, result) {
        console.log('result---->', result);
        if (status === 'complete' && result.info === 'OK') {
          
          const { lng, lat} = result.geocodes[0].location;
          resolve({ lng, lat});
        } else {
          resolve(null);
        }
      });
    } else {
        resolve( null );
    }
  });
}

// 根据地址获取去高德地图定位点
export const getRcoresLocationAsync = (plugins: IPlugins | undefined, records: ISimpleRecords) => {
  const { address } = records

  

  return new Promise((resolve, reject) => {
    if(!plugins) {
      return resolve({
        ...records,
        location: null
      });
    }
    if(address &&  address !== '') {
      plugins.geocoder.getLocation(address, function(status, result) {
        if (status === 'complete' && result.info === 'OK') {
          
          const { lng, lat} = result.geocodes[0].location;
          resolve({
            ...records,
            location: [lng, lat]
          });
        } else {
          resolve({
            ...records,
            location: null
          });
        }
      });
    } else {
        resolve({
          ...records,
          location: null
        });
    }
  });
}

// 根据地址数组获取去高德地图定位点
export const getLocationArrayAsync = (plugins: IPlugins | undefined, records: any) => {
  if(!plugins) {
    return;
  }
 
  return new Promise((resolve, reject) => {
    plugins.geocoder.getLocation(records, function(status, result) {
      console.log('records--->', records);
      if (status === 'complete' && result.info === 'OK') {
        // const { lng, lat} = result.geocodes[0].location;
        console.log('result--->', result);
        resolve(result.geocodes);
      } else {
        resolve([]);
      }
    });
   
  });
}

// 创建路劲规划
export const creatTransfer = (plugins: IPlugins | undefined,pointA, pointB) => {
  if(!plugins) {
    return
  }
  return new Promise<void>(resolve => {
    plugins.transfer.search(pointA, pointB, function(status, result) {
        if (status === 'complete') {
            console.log(result);
            resolve()
        } else {
            console.log('获取驾车数据失败:' + result);
        }
    });
  });
}


// 增量更新 markAddressRecord
export const comparedMapRecords = (mapRecords: ISimpleRecords[], mapRecordsCache: ISimpleRecords[]) => {

  const mapRecordsCacheObj = {};
  let isRecordDataUpdate = false;
  mapRecordsCache.forEach(mapRecord => {
    mapRecordsCacheObj[`${mapRecord.id}-${mapRecord.address}`] = mapRecord;
  });
  
  const newMapRecords = mapRecords.map(mapRecord => {
    if(mapRecordsCacheObj[`${mapRecord.id}-${mapRecord.address}`]) {
      return {
        ...mapRecordsCacheObj[`${mapRecord.id}-${mapRecord.address}`],
        title: mapRecord.title,
        isAddressUpdate: false,
      }
    } else {
      isRecordDataUpdate = true;
      return {
        ...mapRecord,
        isAddressUpdate: true
      }
    }
  });

  return {
    newMapRecords,
    isRecordDataUpdate
  }
}



// 地址处理
export const getCoordinateRecords = async (
    plugins: IPlugins | undefined,
    // textCoordinateRecordsCache, 
    mapRecords: ISimpleRecords[]
  ) => {
 
  return new Promise<ISimpleRecords[]>(async (resolve, reject) => {
    // let newRecords
    // if(textCoordinateRecordsCache && textCoordinateRecordsCache.length === 0) { 
    //   newRecords = mapRecords
    // } else {
    //  const { newMapRecords, isRecordDataUpdate  } = comparedMapRecords(mapRecords, textCoordinateRecordsCache);
    // }
    const asyncRecords = mapRecords.map(async record => {
      if(record.isAddressUpdate) {
        return getRcoresLocationAsync(plugins, record);
      } else {
        return record
      }
    });
    const res  = await Promise.all(asyncRecords) as ISimpleRecords[];
    resolve(res);
    
  });
}




 /* 创建标记点 
  ** record: 标点信息
  ** markerConfig: 标点参数配置
  ** transfer: 创建路径对象
  */
export const creatMarker = (
    expandRecord: (expandRecordParams: IExpandRecord) => void,
    record: any, 
    icon: AMap.Icon,
    infoWindow,
    map
  ) => {
    if(!record.location) {
      return;
    }
    const marker =  new AMap.Marker({
      icon,
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