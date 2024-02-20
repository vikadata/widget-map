import React, { useState } from "react";
import {
  useSettingsButton,
  useCloudStorage,
  ViewPicker,
  FieldPicker,
  useActiveViewId,
  useViewIds,
  useFields,
  getLanguage,
  RuntimeEnv,
  useMeta,
} from "@apitable/widget-sdk";
import {
  RadioGroup,
  Radio,
  TextInput,
  Modal,
  Message,
  LinkButton,
} from "@apitable/components";
import styles from "./setting.module.less";
import { InfoCircleOutlined, ChevronRightOutlined } from "@apitable/icons";
import { IMapToken } from "./interface/map";
import AMapLoader from "@amap/amap-jsapi-loader";
import { Strings, t } from "./i18n";

export const Setting: React.FC = () => {
  // 设置是否打开
  const [isSettingOpened, toggleSettings] = useSettingsButton();
  // useActiveViewId 存在在仪表盘下新建获取为空，所以需要拿到所有表的第一个
  const defaultViewId = useActiveViewId() || useViewIds()[0];
  const defaultFields = useFields(defaultViewId);

  // 视图ID
  const [viewId, setViewId] = useCloudStorage<string>(
    "selectedViewId",
    defaultViewId,
  );

  // 地址字段ID 以及类型
  const [addressType, setAddressType] = useCloudStorage<string | number>(
    "addressType",
    "text",
  );
  const [addressFieldId, setAddressFieldId] =
    useCloudStorage<string>("address");

  // 名称字段ID
  const [titleFieldID, setTitleFieldId] = useCloudStorage<string>(
    "title",
    defaultFields[0].fieldData.id,
  );

  const [mapToken, setToken] = useCloudStorage<IMapToken>("mapToken");

  // 高德apiToken
  const [apiToken, setApiToken] = useState<string>(mapToken.key || "");
  const [securityJsCode, setSecurityJsCode] = useState<string>(mapToken.security || "");

  const [modalVisible, setModalVisible] = useState<boolean>(false);


  const lang = getLanguage().replace("-", "_");

  const meta = useMeta();

  const confirmToken = () => {
    setToken({
      key: apiToken,
      security: securityJsCode,
    });

    setModalVisible(false);
    Message.success({ content: "密钥已保存" });
    AMapLoader.reset();
  };

  return isSettingOpened && meta.runtimeEnv == RuntimeEnv.Desktop ? (
    <div className={styles.settingContent}>
      <h1>
        {t(Strings.map_setting)}{" "}
        <a
          href="https://help.vika.cn/docs/guide/intro-widget-location-map"
          target="_blank"
        >
          <InfoCircleOutlined className={styles.questionIcon} size={17} />
        </a>
      </h1>
      <div style={{ display: "flex", height: "100%" }}>
        <div style={{ flexGrow: 1, overflow: "auto" }}>
          <div className={styles.formItem}>
            <FormItem label={t(Strings.select_view)}>
              <ViewPicker
                viewId={viewId}
                onChange={(option) => setViewId(option.value)}
              />
            </FormItem>
            <FormItem label={t(Strings.select_feild)}>
              <FieldPicker
                viewId={viewId}
                fieldId={addressFieldId}
                onChange={(option) => setAddressFieldId(option.value)}
              />
            </FormItem>
            <FormItem
              label={t(Strings.switch_address_type)}
              help={t(Strings.formate_type_info)}
              link="https://help.vika.cn/docs/guide/intro-widget-location-map/#switch-address-type"
            >
              <RadioGroup
                name="btn-group-with-default"
                isBtn
                value={addressType}
                block
                onChange={(e, value) => {
                  setAddressType(value);
                }}
              >
                <Radio value="text">{t(Strings.text_type)}</Radio>
                <Radio value="latlng">{t(Strings.latlng_type)}</Radio>
              </RadioGroup>
            </FormItem>
            <FormItem label={t(Strings.select_name_field)}>
              <FieldPicker
                viewId={viewId}
                fieldId={titleFieldID}
                onChange={(option) => setTitleFieldId(option.value)}
              />
            </FormItem>
            <h1>{t(Strings.more_setting)}</h1>
            <label className={styles.settingLabel}>
              {t(Strings.setting_api_info)}
            </label>
            <div
              className={styles.settingToken}
              onClick={() => setModalVisible(true)}
            >
              {t(Strings.setting_api_key)} <ChevronRightOutlined />
            </div>
          </div>
        </div>
      </div>
      <Modal
        title={t(Strings.setting_modal_title)}
        visible={modalVisible}
        onCancel={() => setModalVisible(false)}
        onOk={() => confirmToken()}
        width={360}
        okText={t(Strings.confirm)}
        cancelText={t(Strings.cancel)}
      >
        <div className={styles.modalContent}>
          <ul>
            <li>
              1. {t(Strings.go_to)}{" "}
              <LinkButton
                underline={false}
                href="https://lbs.amap.com/"
                target="_blank"
              >
                {t(Strings.amap)}{" "}
              </LinkButton>{" "}
              {t(Strings.amap_login)}{" "}
            </li>
            {lang === "zh_CN" ? (
              <li>
                2. 在
                <LinkButton
                  underline={false}
                  href="https://console.amap.com/dev/key/app"
                  target="_blank"
                >
                  后台
                </LinkButton>
                创建应用并添加Key{" "}
                <LinkButton
                  underline={false}
                  href="https://lbs.amap.com/api/jsapi-v2/guide/abc/prepare"
                  target="_blank"
                >
                  （官方教程）
                </LinkButton>
              </li>
            ) : (
              <li>
                2. <span> Create an app and add a key on the platform</span>{" "}
                <LinkButton
                  underline={false}
                  href="https://lbs.amap.com/api/jsapi-v2/guide/abc/prepare"
                  target="_blank"
                >
                  （official tutorial）
                </LinkButton>
              </li>
            )}
            {lang === "zh_CN" ? (
              <li>
                3. 在
                <LinkButton
                  underline={false}
                  href="https://console.amap.com/dev/key/app"
                  target="_blank"
                >
                  后台
                </LinkButton>
                获取Key和安全密钥输入到下方
              </li>
            ) : (
              <li>3. Get the key and jscode,enter them below</li>
            )}
          </ul>
          <FormItem label="Key">
            <TextInput
              placeholder={t(Strings.enter_info)}
              value={apiToken}
              onChange={(e) => setApiToken(e.target.value)}
              block
            />
          </FormItem>
          <FormItem label={t(Strings.jscode)}>
            <TextInput
              placeholder={t(Strings.enter_info)}
              value={securityJsCode}
              onChange={(e) => setSecurityJsCode(e.target.value)}
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

const FormItem = (props: IFormItemProps) => {
  const { label, children, help, link } = props;
  return (
    <div style={{ display: "flex", flexDirection: "column", marginBottom: 16 }}>
      <label className={styles.settingLabel}>
        {label}{" "}
        {help && (
          <a href={link} target="_blank">
            {help}
          </a>
        )}
      </label>
      {children}
    </div>
  );
};
