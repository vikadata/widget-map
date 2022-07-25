import React, { useState } from 'react';
import { useSettingsButton, useCloudStorage, ViewPicker, FieldPicker, useActiveViewId, useViewIds, useFields } from '@vikadata/widget-sdk';
import { RadioGroup, Radio, TextInput, Modal, Message, LinkButton } from '@vikadata/components';
import styles from './setting.module.less';
import { InformationLargeOutlined, ChevronRightOutlined } from '@vikadata/icons';
import { IMapToken } from './interface/map';
import AMapLoader from '@amap/amap-jsapi-loader';

export const Setting: React.FC = () => {
  // 设置是否打开
  const [isSettingOpened] = useSettingsButton();
  // useActiveViewId 存在在仪表盘下新建获取为空，所以需要拿到所有表的第一个
  const defaultViewId = useActiveViewId() || useViewIds()[0];
  const defaultFields = useFields(defaultViewId);
  
  // 视图ID
  const [viewId, setViewId] = useCloudStorage<string>('selectedViewId', defaultViewId);
  
  // 地址字段ID 以及类型
  const [addressType, setAddressType] = useCloudStorage<string | number>('addressType', 'text');
  const [addressFieldId, setAddressFieldId] = useCloudStorage<string>('address');

  // 名称字段ID
  const [titleFieldID, setTitleFieldId] = useCloudStorage<string>('title', defaultFields[0].fieldData.id);

  // 高德apiToken
  const [apiToken, setApiToken] = useState<string>('');
  const [securityJsCode, setSecurityJsCode] = useState<string>('');

  const [modalVisible, setModalVisible] = useState<boolean>(false);

  const [mapToken, setToken] = useCloudStorage<IMapToken>('mapToken');

  

  const confirmToken = () => {
    setToken({
      key: apiToken,
      security: securityJsCode
    });
    
    setModalVisible(false);
    Message.success({ content: '密钥已保存' });
    AMapLoader.reset();
  }

  return isSettingOpened ? (
    <div className={styles.settingContent}>
      <h1>地图配置 <a href="https://vika.cn/help/intro-widget-location-map/" target="_blank"><InformationLargeOutlined className={styles.questionIcon} size={17}/></a></h1>
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
            <FormItem label="格式说明" help="格式说明" link='https://vika.cn/help/intro-widget-location-map/#5-toc-title'>
                <RadioGroup name="btn-group-with-default" isBtn value={addressType} block onChange={(e, value) => {
                  setAddressType(value);
                }}>
                  <Radio value="text">文本地址</Radio>
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
            <h1>其他配置</h1>
            <label className={styles.settingLabel}>填写你的高德地图账号以提高流量（选填）</label>
            <div className={styles.settingToken} onClick={() => setModalVisible(true)}>填写应用的Key和秘钥 <ChevronRightOutlined /></div>
          </div>
        </div>
      </div>
      <Modal 
        title="填写应用的Key和秘钥" 
        visible={modalVisible} 
        onCancel={() => setModalVisible(false)}
        onOk={() => confirmToken()}
        width={360}
      >
        <div className={styles.modalContent}>
            <ul>
                <li>1. 前往 <LinkButton underline={false} href="https://lbs.amap.com/" target="_blank">高德地图</LinkButton> 注册并登录 </li>
                <li>2. 在<LinkButton underline={false} href="https://console.amap.com/dev/key/app" target="_blank">后台</LinkButton>创建应用并添加Key <LinkButton underline={false} href="https://lbs.amap.com/api/jsapi-v2/guide/abc/prepare" target="_blank">官方教程</LinkButton></li>
                <li>3. 在<LinkButton underline={false} href="https://console.amap.com/dev/key/app" target="_blank">后台</LinkButton>获取Key和安全密钥输入到下方</li>
            </ul>
              <FormItem label="Key">
              <TextInput
                placeholder="请输入内容"
                value={apiToken}
                onChange={e => setApiToken(e.target.value)}
                block
              />
            </FormItem>
            <FormItem label="密钥"  >
              <TextInput
                placeholder="请输入内容"
                value={securityJsCode}
                onChange={e => setSecurityJsCode(e.target.value)}
                block
              />
            </FormItem>
        </div>
      </Modal>
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
      <label className={styles.settingLabel} >{label} { help && <a href={link} target="_blank">{help}</a> }</label>
      {children}
    </div>
  )
}