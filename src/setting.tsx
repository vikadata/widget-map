import React from 'react';
import { useSettingsButton, useCloudStorage, ViewPicker, FieldPicker, useFields,  } from '@vikadata/widget-sdk';
import { Box, Select, Button, TextInput } from '@vikadata/components';
import styles from './setting.module.less';


interface InfolistType{
  text: string,
  value: string,
}

export const Setting: React.FC = () => {
  const [isSettingOpened] = useSettingsButton();
  const [viewId, setViewId] = useCloudStorage<string>('selectedViewId');
  const [mapSettingList, setMapSettingList] = useCloudStorage<Array<InfolistType>>('mapSettingList', [{ text: '地址', value: ''}, { text: '名称', value: ''}]);
  const [mapSettingListStatus, setMapSettingListStatus] = useCloudStorage<boolean>('mapSettingListStatus', false);
  const [addressType, setAddressType] = useCloudStorage<string | number>('addressType', 'text');
  const [apiKey, setApiKey] = useCloudStorage<string>('apiKey');
  const [securityCode, setSecurityCode] = useCloudStorage<string>('securityCode');

  const addressTypeOption = [
    {
      label: '文本',
      value: 'text'
    },
    {
      label: '经纬度',
      value: 'latlng',
    }
  ]

  // 更新配置选项
  function updateInfoList(index: number, type: string, data: string) {
    let newInfoWindowList = mapSettingList;
    newInfoWindowList[index][type] = data;
    setMapSettingList([...newInfoWindowList]);
  }

  // 确认配置选项
  function confirmMapSetting() {
    setMapSettingListStatus(false);
    let check = true;
    mapSettingList.forEach(formItem => {
      if(formItem.text === '' || formItem.value === '' ) {
        check = false;
      }
    });
    setMapSettingListStatus(check);
  }

  return isSettingOpened ? (
    <div style={{ flexShrink: 0, width: '300px', borderLeft: 'solid 1px gainsboro'}}>
      <h1 style={{ paddingLeft: "5px", marginBottom: 0 }}>设置</h1>
      <div style={{ display: 'flex', height: '100%' }}>
        <div style={{ flexGrow: 1, overflow: 'auto'}}>
        <Box
          padding="30px 10px 30px 10px"
          borderBottom="2px solid lightgrey"
        >
          <FormItem label="View" >
            <ViewPicker   viewId={viewId} onChange={option => setViewId(option.value)} />
          </FormItem>
        </Box>
        <Box
          padding="30px 10px 30px 10px"
          borderBottom="2px solid lightgrey"
        >
          <div className={styles.formItem}>
            <h3>填写API Key</h3>
            <TextInput 
              block
              type="password"
              value={apiKey}
              placeholder="请输入API Key"
              onChange={e => setApiKey(e.target.value)}
            />
            <h3>填写API Key安全密钥</h3>
            <TextInput 
              block
              type="password"
              value={securityCode}
              placeholder="请输入API Key安全密钥"
              onChange={e => setSecurityCode(e.target.value)}
            />
            <h3>选择地址字段类型</h3>
            <Select options={addressTypeOption}
              value={addressType}
              onSelected={(option) => {
                setAddressType(option.value);
              }} />
            <h3>选择地址字段</h3>
            <FieldPicker  viewId={viewId} fieldId={mapSettingList[0].value} onChange={option => updateInfoList( 0,  'value', option.value)} />
            <h3>选择名称字段</h3>
            <FieldPicker  viewId={viewId} fieldId={mapSettingList[1].value} onChange={option => updateInfoList( 1,  'value', option.value)} />
          </div>
          <div className={styles.buttonContent}>
            <Button className={styles.marginType} variant="jelly" color="primary" block  onClick={confirmMapSetting}>确认</Button>
          </div>
        </Box>
        </div>
      </div>
    </div>
  ) : null;
};

const FormItem = ({label, children}) => {
  return (
    <div style={{display: 'flex', flexDirection: 'column', marginBottom: 16}}>
      <label style={{paddingBottom: 6, fontSize: 13, color: '#636363', fontWeight: 'bold'}}>{label}</label>
      {children}
    </div>
  )
}