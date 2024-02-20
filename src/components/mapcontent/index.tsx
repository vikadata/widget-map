import React, { useState, useEffect, useMemo, useRef } from "react";
import {
  useCloudStorage,
  useRecords,
  useExpandRecord,
  useActiveCell,
  useRecord,
  useFields,
  useActiveViewId,
  useViewIds,
} from "@apitable/widget-sdk";
import {
  getLocationAsync,
  getCoordinateRecords,
  comparedMapRecords,
} from "../../utils/amap_api";
import { useDebounce, useRequest } from "ahooks";
import { TextInput, Message, Tooltip } from "@apitable/components";
import styles from "./style.module.less";
import {
  SearchOutlined,
  SubtractCircleOutlined,
  AddCircleOutlined,
  EyeOpenOutlined,
  EyeCloseOutlined,
  PositionOutlined,
  InfoCircleFilled,
  CloseOutlined,
} from "@apitable/icons";
import { creatIconLayer, creatLabelLayer } from "../../utils/common";
import { useAsyncEffect } from "../../utils/hooks";
import { getGeoJson } from "../../utils/tools";
import markerIcon from "../../static/img/mark.svg";
import markerSelectedIcon from "../../static/img/markSelect.svg";
import { IPlugins, ISimpleRecords } from "../../interface/map";
import "@amap/amap-jsapi-types";
import { Strings, t } from "../../i18n";
import { slice } from "lodash";
import { message as messageAntd } from "antd";

interface IMapContentProps {
  lodingStatus: boolean;
  AMap: any;
  map: any; // 地图实例
  plugins: IPlugins | undefined;
}

export const MapContent: React.FC<IMapContentProps> = (props) => {
  const { lodingStatus, map, AMap, plugins } = props;
  // useActiveViewId 存在在仪表盘下新建获取为空，所以需要拿到所有表的第一个
  const defaultViewId = useActiveViewId() || useViewIds()[0];
  const defaultFields = useFields(defaultViewId);
  // 获取表格视图ID
  const [viewId] = useCloudStorage<string>("selectedViewId", defaultViewId);
  // 获取所有行的信息
  const records = useRecords(viewId);
  // 展开卡片
  const expandRecord = useExpandRecord();
  // 中心标点
  const [markerCenterLayer, setMarkerCenterLayer] = useState<AMap.Marker>();

  // 搜索输入
  const [searchKey, setSearchKey] = useState<string>();
  const debouncedSearchKey = useDebounce(searchKey, { wait: 500 });
  // 地址类型
  const [addressType] = useCloudStorage<string | number>("addressType", "text");
  // 地址字段ID
  const [addressFieldId] = useCloudStorage<string>("address");
  // 名称字段ID
  const [titleFieldID] = useCloudStorage<string>(
    "title",
    defaultFields[0].fieldData.id,
  );

  // 获取表格选中信息
  const activeCell = useActiveCell();
  const activeRecord = useRecord(activeCell?.recordId);

  // 地图标点集合
  const [iconLayer, setIconlayer] = useState<AMap.Marker[]>();

  // 标点label图层
  const [isShowLabel, setIsShowLabel] = useState<boolean>(false);
  const labelLayer = useRef();

  // 可视化容器
  const [localContainer, setLocalContainer] = useState<any>();

  const [textCoordinateRecordsCache, setTextCoordinateRecordsCache] =
    useCloudStorage<ISimpleRecords[]>("textCoordinateRecordsCache", []);

  const [isSetTextCache, setIsSetTextCache] = useCloudStorage<boolean>(
    "isSetTextCache",
    false,
  );

  const [isRecordDataUpdate, setIsRecordDataUpdate] = useState<boolean>(false);

  // 默认Icon 配置
  const iconDefaultConfig = useMemo(() => {
    return lodingStatus
      ? {
          type: "image",
          image: markerIcon,
          anchor: "center",
        }
      : null;
  }, [AMap, lodingStatus]);
  const infoWindow = useRef();
  // 默认信息弹窗配置
  infoWindow.current = useMemo(() => {
    return lodingStatus
      ? new AMap.InfoWindow({
          content: '<div class="infowindowContent" ></div>', //传入 dom 对象，或者 html 字符串
          offset: [0, -32],
          isCustom: true,
          // anchor: 'middle-left'
        })
      : null;
  }, [AMap, lodingStatus]);

  const canvas = document.createElement("canvas");

  // 根据选中信息设置中心坐标
  useAsyncEffect(async () => {
    if (!map) {
      return;
    }

    const selectAddress = activeRecord?.getCellValueString(addressFieldId);

    let lnglat;
    let position;
    try {
      if (addressType === "latlng") {
        lnglat = selectAddress ? selectAddress.split(",") : "";
        position = lnglat !== "" ? new AMap.LngLat(lnglat[0], lnglat[1]) : null;
      } else {
        lnglat = await getLocationAsync(plugins, selectAddress);
        position = lnglat ? [lnglat.lng, lnglat.lat] : null;
      }

      map.setCenter(position, true);
    } catch (e) {}
  }, [activeCell, map]);

  // 切换Label
  useEffect(() => {
    if (!map || !labelLayer.current) {
      return;
    }

    if (!isShowLabel) {
      labelLayer.current.setOpacity(0);
    } else {
      labelLayer.current.setOpacity(1);
    }
  }, [map, isShowLabel]);

  // 设置搜索定位功能
  useEffect(() => {
    if (!plugins || !plugins.autoComplete) {
      return;
    }
    plugins.autoComplete.clearEvents("select");
    plugins.autoComplete.on("select", select);
  }, [plugins, map, debouncedSearchKey]);

  function select(e) {
    setSearchKey(e.poi.name);
    //创建标点 并且设置为地图中心
    if (markerCenterLayer) {
      map.remove(markerCenterLayer);
    }
    const selectIcon = new AMap.Icon({
      ...iconDefaultConfig,
      image: markerSelectedIcon,
    });
    const centerMarker = new AMap.Marker({
      icon: selectIcon,
      //...其他Marker选项...，不包括content
      map: map,
      anchor: "bottom-center",
      label: {
        content: e.poi.name,
      },
      position: [e.poi.location.lng, e.poi.location.lat],
    });

    setMarkerCenterLayer(centerMarker);
    map.setCenter([e.poi.location.lng, e.poi.location.lat]);
  }

  const updateTextCache = (mapRecords: ISimpleRecords[]) => {
    Message.default({
      content: t(Strings.map_loading),
      messageKey: "loadingMark",
      duration: 0,
    });
    getTextCoordinate(mapRecords);
    setIsSetTextCache(true);
    messageAntd.destroy();
  };

  useEffect(() => {
    if (isSetTextCache) {
      messageAntd.destroy();
    }
  }, [isSetTextCache]);

  useEffect(() => {
    if (!plugins || !addressFieldId) {
      return;
    }

    if (iconLayer) {
      localContainer?.remove(iconLayer);
      map.remove(localContainer);
    }

    if (labelLayer.current) {
      labelLayer.current.destroy();
      map.remove(labelLayer.current);
    }

    // 限制加载标点数量
    const mapRecords = slice(records, 0, 2000).map((record) => {
      return {
        title: record.getCellValueString(titleFieldID) || "",
        address: record.getCellValueString(addressFieldId) || "",
        id: record.id,
        isAddressUpdate: true,
      };
    });

    if (addressType === "text") {
      const { newMapRecords, isRecordDataUpdate } = comparedMapRecords(
        mapRecords,
        textCoordinateRecordsCache,
      );
      setIsRecordDataUpdate(isRecordDataUpdate as boolean);
      if (isRecordDataUpdate) {
        messageAntd.info({
          icon: <InfoCircleFilled size={16} />,
          content: (
            <div className={styles.antdMessageContent}>
              <span>{t(Strings.run_load_text_icon)}</span>
              <span
                className={styles.antdMessageButton}
                onClick={() => updateTextCache(newMapRecords)}
              >
                {t(Strings.reload)}
              </span>
              <CloseOutlined
                onClick={() => {
                  messageAntd.destroy();
                }}
                className={styles.antdMessageCloseButton}
                size={10}
              />
            </div>
          ),
          key: "loadTextDataMessage",
          duration: 0,
        });
      } else {
        updateTextCache(newMapRecords);
      }
    } else {
      Message.default({
        content: t(Strings.map_loading),
        messageKey: "loadingMark",
        duration: 0,
      });
      const res = mapRecords
        .map((record) => {
          const location = record.address ? record.address.split(",") : "";
          if (
            !location ||
            location.length !== 2 ||
            isNaN(parseFloat(location[0])) ||
            isNaN(parseFloat(location[0]))
          ) {
            return null;
          } else {
            return {
              ...record,
              location: [
                parseFloat(location[0]).toFixed(6),
                parseFloat(location[1]).toFixed(6),
              ],
            };
          }
        })
        .filter(Boolean) as ISimpleRecords[];
      creatLayer(plugins, res);
    }
  }, [
    records,
    plugins,
    addressFieldId,
    addressType,
    titleFieldID,
    lodingStatus,
  ]);

  // 配置切换更新
  const { data, run: getTextCoordinate } = useRequest(
    (mapRecords) => getCoordinateRecords(plugins, mapRecords),
    {
      debounceWait: 500,
      manual: true,
      retryCount: 3,
    },
  );

  const creatLayer = (plugins, data) => {
    // 创建icon图层
    const recordsGeo = getGeoJson(data);
    const newIconLayer = creatIconLayer(
      map,
      plugins,
      expandRecord,
      markerIcon,
      infoWindow.current,
      recordsGeo,
    );
    const loca = new plugins.Loca.Container({
      map,
    });
    loca.add(newIconLayer);
    setLocalContainer(loca);
    setIconlayer(newIconLayer);

    // 创建label图层
    const newLabelLayer = creatLabelLayer(map, canvas, AMap, isShowLabel, data);
    labelLayer.current = newLabelLayer;

    Message.success({
      content: `${t(Strings.map_loading_complte1)}${recordsGeo.length}${t(
        Strings.map_loading_complte2,
      )}`,
      messageKey: "loadingMark",
      duration: 3,
    });
  };

  // 文本地址请求之后
  useEffect(() => {
    if (!plugins || !data) {
      return;
    }

    setIsSetTextCache(false);
    if (isRecordDataUpdate) {
      setTextCoordinateRecordsCache(data);
    } else {
      creatLayer(plugins, data);
    }
  }, [data]);

  useEffect(() => {
    if (!plugins || !textCoordinateRecordsCache) {
      return;
    }
    creatLayer(plugins, textCoordinateRecordsCache);
  }, [textCoordinateRecordsCache]);

  const backLocation = (plugins) => {
    plugins.citySearch.getLocalCity(function (status, result) {
      if (status === "complete" && result.info === "OK") {
        // 查询成功，result即为当前所在城市信息
        const citybounds = result.bounds;
        map.setBounds(citybounds);
      } else {
        Message.error({ content: `定位失败` });
      }
    });
  };

  return (
    <div style={{ width: "100%", height: "100%", position: "relative" }}>
      <div
        id="mapContainer"
        style={{ width: "100%", height: "100%", position: "relative" }}
      ></div>
      <div>
        <div className={styles.searchContent}>
          <div className={styles.searchBlock}>
            <TextInput
              className={styles.searchInput}
              placeholder={t(Strings.enter_info)}
              size="small"
              id="searchInput"
              value={searchKey}
              onChange={(e) => setSearchKey(e.target.value)}
              block
              suffix={<SearchOutlined />}
            />
          </div>
        </div>
        <Tooltip
          content={
            isShowLabel
              ? t(Strings.hide_address_name)
              : t(Strings.show_address_name)
          }
          placement="left"
        >
          <div className={styles.labelControl}>
            {isShowLabel ? (
              <EyeOpenOutlined
                size={16}
                className={styles.tooBarIcon}
                onClick={() => setIsShowLabel(!isShowLabel)}
              />
            ) : (
              <EyeCloseOutlined
                size={16}
                className={styles.tooBarIcon}
                onClick={() => setIsShowLabel(!isShowLabel)}
              />
            )}
          </div>
        </Tooltip>
        <Tooltip content={t(Strings.location_city)} placement="left">
          <div className={styles.backPosition}>
            <PositionOutlined
              size={16}
              className={styles.tooBarIcon}
              onClick={() => backLocation(plugins)}
            />
          </div>
        </Tooltip>
        <div className={styles.toolBar}>
          <AddCircleOutlined
            size={16}
            className={styles.tooBarIcon}
            onClick={() => {
              map.zoomIn();
            }}
          />
          <SubtractCircleOutlined
            size={16}
            className={styles.tooBarIcon}
            onClick={() => {
              map.zoomOut();
            }}
          />
        </div>
      </div>
    </div>
  );
};
