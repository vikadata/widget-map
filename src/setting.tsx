import React from 'react';
import { useSettingsButton, useCloudStorage, ViewPicker, FieldPicker } from '@vikadata/widget-sdk';
import { RadioGroup, Radio } from '@vikadata/components';
import styles from './setting.module.less';


export const Setting: React.FC = () => {
  // 设置是否打开
  const [isSettingOpened] = useSettingsButton();
  // 视图ID
  const [viewId, setViewId] = useCloudStorage<string>('selectedViewId');
  // 地址字段ID 以及类型
  const [addressType, setAddressType] = useCloudStorage<string | number>('addressType', 'text');
  const [addressFieldId, setAddressFieldId] = useCloudStorage<string>('address');

  // 名称字段ID
  const [titleFieldID, setTitleFieldId] = useCloudStorage<string>('title');

  return isSettingOpened ? (
    <div className={styles.settingContent}>
      <h1>地图配置</h1>
      <div style={{ display: 'flex', height: '100%' }}>
        <div style={{ flexGrow: 1, overflow: 'auto'}}>
          <div className={styles.formItem}>
            <FormItem label="选择地图数据源" >
              <ViewPicker   viewId={viewId} onChange={option => setViewId(option.value)} />
            </FormItem>
            <FormItem label="选择地址字段" >
              <FieldPicker  
                viewId={viewId} 
                fieldId={addressFieldId}
                onChange={option => setAddressFieldId(option.value)} 
              />
            </FormItem>
            <FormItem label="选择地址字段类型" >
                <RadioGroup name="btn-group-with-default" isBtn value={addressType} block onChange={(e, value) => {
                  setAddressType(value);
                }}>
                  <Radio value="text">文本</Radio>
                  <Radio value="latlng">经纬度</Radio>
                </RadioGroup>
            </FormItem>
            <FormItem label="选择名称字段" >
              <FieldPicker  
                viewId={viewId} 
                fieldId={titleFieldID} 
                onChange={option => setTitleFieldId(option.value)} 
              />
            </FormItem>
          </div>
      
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