import React from 'react';
import { useSettingsButton, useCloudStorage, ViewPicker, FieldPicker } from '@vikadata/widget-sdk';
import { RadioGroup, Radio, Button, TextInput } from '@vikadata/components';
import styles from './setting.module.less';
import { InformationLargeOutlined } from '@vikadata/icons';

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

  // 更新地图
  // const [updateMap, setUpdateMap] = useCloudStorage<boolean>('updateMap', false);

  // 高德apiToken
  // const [apiToken, setApiToken] = useCloudStorage<string>('apiToken', '5b625cd96fdd79c2918cf5ec2cd7720c');
  // const [securityJsCode, setSecurityJsCode] = useCloudStorage<string>('securityJsCode', '41d2e666297c21beda8897b2dfecc92f');

  return isSettingOpened ? (
    <div className={styles.settingContent}>
      <h1>地图配置 <a href="" target="_blank"><InformationLargeOutlined className={styles.questionIcon} size={17}/></a></h1>
      <div style={{ display: 'flex', height: '100%' }}>
        <div style={{ flexGrow: 1, overflow: 'auto'}}>
          <div className={styles.formItem}>
            <FormItem label="选择一个视图来读取地理位置" >
              <ViewPicker   viewId={viewId} onChange={option => setViewId(option.value)} />
            </FormItem>
            <FormItem label="选择一个包含地址或者经纬度的字段" >
              <FieldPicker  
                viewId={viewId} 
                fieldId={addressFieldId}
                onChange={option => setAddressFieldId(option.value)} 
              />
            </FormItem>
            {/* <FormItem label="填写apiToken">
              <TextInput
                block
                placeholder="请输入apiToken"
                value={apiToken}
                onChange={e => setApiToken(e.target.value)}
                type="password"
              />
            </FormItem>
            <FormItem label="填写securityJsCode">
              <TextInput
                block
                placeholder="请输入securityJsCode"
                value={securityJsCode}
                onChange={e => setSecurityJsCode(e.target.value)}
                type="password"
              />
            </FormItem> */}
            <FormItem label="切换地址的数据类型" help="数据类型说明">
                <RadioGroup name="btn-group-with-default" isBtn value={addressType} block onChange={(e, value) => {
                  setAddressType(value);
                }}>
                  <Radio value="text">文本</Radio>
                  <Radio value="latlng">经纬度</Radio>
                </RadioGroup>
            </FormItem>
            <FormItem label="选择一个字段作为地址名称" >
              <FieldPicker  
                viewId={viewId} 
                fieldId={titleFieldID} 
                onChange={option => setTitleFieldId(option.value)} 
              />
            </FormItem>
            {/* <FormItem label="" >
              { showCreatMap && <Button block onClick={() => setUpdateMap(!updateMap)}>生成地图</Button> }
            </FormItem> */}
            {/* <FormItem label="" >
              <Button block onClick={() => setUpdateMap(!updateMap)}>更新地图</Button>
            </FormItem> */}
          </div>
        </div>
      </div>
    </div>
  ) : null;
};

interface IFormItemProps {
  label: string;
  children: any;
  help?: string;
  link?: string;
}

const FormItem = (props : IFormItemProps) => {
  const {label, children, help, link } = props;
  return (
    <div style={{display: 'flex', flexDirection: 'column', marginBottom: 16}}>
      <label className={styles.settingLabel} >{label} { help && <a href={link}>{help}</a> }</label>
      {children}
    </div>
  )
}