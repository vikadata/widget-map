// 创建icon标点图层
export const  creatIconLayer = (map, plugins, expandRecord, markerIcon, infoWindow, geoRecords) => {

  const iconLayer = new plugins.Loca.IconLayer({
    zIndex: 90,
    opacity: 1,
    visible: true,
  });
  
  const geo = new plugins.Loca.GeoJSONSource({
    data: {
        "type": "FeatureCollection",
        "features": geoRecords,
    },
  });
  
  iconLayer.setSource(geo);

  iconLayer.setStyle({
    unit: 'px',
    icon: markerIcon,
    iconSize: [30,30],
    rotation: 0,
    offset: [0,15],
  });


  //点击展开弹窗
  map.on('click', (e) => {
      const feat = iconLayer.queryFeature(e.pixel.toArray());
      if (feat) {
          expandRecord({recordIds: [feat.properties.id]});
      }
  });

  // 显示信息弹窗
  map.on('mousemove', (e) => {
    const feat = iconLayer.queryFeature(e.pixel.toArray());
  
    if(feat) {
      const title = feat.properties.title;
      const titleContent = title.length < 30 ? title : title.substring(0, 30) + '...';
      infoWindow.setContent(`<div class="infowindowContent" ><h1>${titleContent}</h1><p>${feat.properties.address}</p></div>`)
      infoWindow.open(map, feat.coordinates);
    } else {
      infoWindow.close(map);
    }
  });

  return iconLayer;
}

export const creatLabelLayer = (map, canvas, AMap, isShowLabel, locationRecords) => {
    
  const customLabelLayer = new AMap.CustomLayer(canvas, {
    zooms: [3, 20],
    zIndex: 12,
  });
  
  const onRender = function(){
      const retina = AMap.Browser.retina;
      const size = map.getSize();//resize
      let width = size.width;
      let height = size.height;
      canvas.style.width = width+'px'
      canvas.style.height = height+'px'
      if(retina){//高清适配
          width*=2;
          height*=2;
      }
      canvas.width = width;
      canvas.height = height;//清除画布
      const ctx = canvas.getContext("2d");
      if(!ctx) {
        return;
      }
      
      ctx.strokeStyle = '#DCDFE5';
      ctx.beginPath();
      ctx.font = "14px PingFang SC";
      
      locationRecords.forEach(locationRecord => {
        const center = locationRecord.location;
        if(!center) {
          return
        }
        let pos = map.lngLatToContainer(center);
        const title = locationRecord.title.length < 9 ? locationRecord.title : locationRecord.title.substring(0,7) + '...';
        const text = ctx.measureText(title);
        if(retina){
            pos = pos.multiplyBy(2);
        }
        ctx.moveTo(pos.x, pos.y);
        ctx.fillStyle = '#fff';
        ctx.fillRect(pos.x + 20, pos.y - 30, text.width + 16, 32);
        ctx.fillStyle = "#2E2E2E";
        ctx.fillText(title, pos.x + 28, pos.y - 10, 164);
      });
   
      ctx.lineWidth = retina? 6 : 3;
      ctx.closePath();
      ctx.stroke();
      ctx.fill();
  }
  customLabelLayer.render = onRender;
  customLabelLayer.setMap(map);
  if(isShowLabel) {
    customLabelLayer.setOpacity(1);
  } else {
    customLabelLayer.setOpacity(0);
  }
  return customLabelLayer;
}