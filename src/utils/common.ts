import { IPlugins, ISimpleRecords } from '../interface/map';

// 根据地址获取去高德地图定位点
export const getLocationAsync = (plugins: IPlugins | undefined, address: any) => {

  if(!plugins) {
    return;
  }

  return new Promise((resolve, reject) => {
   
    if(address) {
      plugins.geocoder.getLocation(address, function(status, result) {
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

  if(!plugins) {
    return;
  }

  return new Promise((resolve, reject) => {
   
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

