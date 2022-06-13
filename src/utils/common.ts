
// 根据地址获取去高德地图定位点
function getLocationAsync(address: any) {
  return new Promise((resolve, reject) => {
   
    if(address) {
      window.Geocoder.getLocation(address, function(status, result) {
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

// 根据地址数组获取去高德地图定位点
function getLocationArrayAsync(records: any) {
  return new Promise((resolve, reject) => {
    window.Geocoder.getLocation(records, function(status, result) {
      if (status === 'complete' && result.info === 'OK') {
        // const { lng, lat} = result.geocodes[0].location;
        resolve(result.geocodes);
      } else {
        resolve([]);
      }
    });
   
  });
}

// 创建路劲规划
async function creatTransfer(pointA, pointB) {
 
  return new Promise<void>(resolve => {
    window.Transfer.search(pointA, pointB, function(status, result) {
        if (status === 'complete') {
            console.log(result);
            resolve()
        } else {
            console.log('获取驾车数据失败:' + result);
        }
    });
  });
}

export { getLocationAsync, creatTransfer, getLocationArrayAsync }