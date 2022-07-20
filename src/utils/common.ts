import { IPlugins, ISimpleRecords } from '../interface/map';

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


// 增量更新 markAddressRecord
export const updateMardkAddressRecord = (simpleRecords, markersLayer) => {
  const markAddressRecordsCopy = [...markersLayer];
      let newRecordIndex : number[] = [];
      let newRecordIsAdd : boolean[] = [];
     
      markAddressRecordsCopy.forEach((mark, index, arr ) => {
        // const markInfo =  mark.getExtData();
        let isExist = false;
        simpleRecords.forEach((record, recordIndex)=> {
            if(mark.id === record.id ) {
              // 已经出现了不用删除不用新增
              isExist = true;
              const newIndex = newRecordIndex.indexOf(recordIndex);
              if(newIndex > - 1) {
                newRecordIsAdd[newIndex] = false;
              } else {
                newRecordIndex.push(recordIndex);
                newRecordIsAdd.push(false);
              }

              // 如果ID相等 检查地址是否变更
              if(mark.address === record.address) {
                // 如果没有变更
                arr[index] = {
                  ...mark,
                  isAddressUpdate: false,
                };
              } else {
                console.log('地址发生了变更');
                // 如果变更了
                arr[index] = {
                  ...mark,
                  address: record.address,
                  isAddressUpdate: true,
                };
              }

              if(mark.title === record.title) {
                // 如果没有变更
                arr[index] = {
                  ...arr[index],
                  isTitleUpdate: false,
                };
              } else {
                // 如果变更了
                arr[index] = {
                  ...arr[index],
                  title: record.title,
                  isTitleUpdate: true,
                };
              }

            } else {
                if(!newRecordIndex.includes(recordIndex)) {
                  newRecordIndex.push(recordIndex);
                  newRecordIsAdd.push(true);
                }
            }
        });
        // 如果找不到了删除这个
        if(!isExist) {
          arr.splice(index,1);
        }

      }, markAddressRecordsCopy);

      // 获取需要新增的信息
      const addreRcored = newRecordIndex.map((item,index) => {
          if(newRecordIsAdd[index]) {
            return simpleRecords[item];
          } else {
            return null;
          }
      }).filter(Boolean);

      return markAddressRecordsCopy.concat(addreRcored);
}
