import { CurbFeatureCollection } from "@/common/curblr";
import { DateTimePickerComponent } from '@syncfusion/ej2-react-calendars';
import { feature, featureCollection, GeoJSONObject } from "@turf/helpers";
import "ant-design-pro/dist/ant-design-pro.css"; // Import whole style
import { Pie } from "ant-design-pro/lib/Charts";
import { Button, Card, Descriptions, Layout, Radio, Select } from "antd";
import axios from 'axios';
import { connect } from "dva";
import { fromJS } from "immutable";
import React from "react";
import MapGL, {Popup, FullscreenControl, GeolocateControl, Marker, NavigationControl, ScaleControl } from "react-map-gl";
import Geocoder from 'react-map-gl-geocoder';
//mapstyle, change to dark matter
import { actions as curblrActions, geoDataFiles } from "../models/curblr";
import './index.css';
import {
  ACTIVITY_COLOR_MAP,
  avgParkingLength, Content, dataLayer, defaultMapStyle, fullscreenControlStyle,
  geolocateStyle, ICON, mapboxAccessToken, mapStateToProps, MAXSTAY_COLOR_MAP, navStyle, PageProps, renderCurblrData, scaleControlStyle, SIZE
} from "./mapboxAccessToken";
import Geometry from 'ol/geom/Geometry';

class Map extends React.Component<PageProps, {}> {
  _mapRef: any;

  state = {
    mode: "activity",
    day: "mo",
    time: "08:01",
    mapStyle: defaultMapStyle,
    viewport: {
      width: "100vw",
      height: "100vh",
      // needs update? default viewport is hard-coded and should dynamically set based on data. PHL viewport:
      //        latitude:  39.950,
      //        longitude:-75.174, //-71.20566699900684,46.81214413176751 - QUEBEC
      //        zoom: 16
      // PDX viewport 
      // latitude: 46.81214413176751,
      // longitude: -71.20566699900684,
      //Centre ville
      longitude: -73.55664074263193,
      latitude: 45.51326741594903,
      // latitude: 45.5322288090008, 
      // longitude: -73.63143205202765,
      zoom: 13
    },
    showHideCard: true,
    sl_arrondRef: "plaza",
    set_dateTimeRef: new Date(),
    data_to_replace: new CurbFeatureCollection(),
    old_VS_new_selector: false,
    mapclicked: false,
    clickedLong: -73.62756337356329,//sfl
    clickedLat: 45.533970387611184,
    // description: {
    //   assetType: null,
    //   sideOfStreet: null,
    //   streetName: null,
    //   Fee: null,
    //   maxStay: null,
    //   timeSpansDates: null,
    //   timeSpansDays: null
    // }
    description: "",
    b_noBorne: "XXX",
    b_periodes: "",
    b_tarif: 0,
    b_maxStay: 0,
    b_nomRue: "XXX"
  };
  
  constructor(props: any) {
    super(props);
    this.hideComponent = this.hideComponent.bind(this);
    this.setArrond =  this.setArrond.bind(this);
    this.setDateTime = this.setDateTime.bind(this);
    // this.onClickMap = this.onClickMap.bind(this);
    this._mapRef = React.createRef();
  }

  geocoderContainerRef = React.createRef();

  _setMapData = (newData: any) => {
    const map = this._getMap();
    if (map) {
      map.getSource("curblrData").setData(newData);
    }
  };

  _getMap = () => {
    return this._mapRef ? this._mapRef.current.getMap() : null;
  };

  _loadData() {
    const mapStyle = defaultMapStyle
      // Add geojson source to map
      .setIn(
        ["sources", "curblrData"],
        fromJS({
          type: "geojson",
          data: renderCurblrData(
            this.props.curblr.data,
            this.state.day,
            this.state.time,
            this.state.mode
          )
        })
      )
      // Add point layer to map
      .set("layers", defaultMapStyle.get("layers").push(dataLayer));

    this.setState({ mapStyle });
  };
  
  onClickMap(evt) {
    console.log("Clicked Point: ", evt.lngLat);
    var coords = evt.lngLat;
    var description = this.getDescriptionFromCoords(coords)
    this.setState(
      { mapclicked: false,
        clickedLong: coords[0],
        clickedLat: coords[1],
        // b_noBorne: description[0],
        b_nomRue: description[0],
        // b_periodes: description[2],
        b_maxStay: description[2],
        b_tarif: description[1]
        });
  };
 
  getDescriptionFromCoords(coords){
    var geojsonData = (this.state.old_VS_new_selector? this.state.data_to_replace : this.props.curblr.data);
    // var geojsonData = this._getMap().getSource("curblrData")["_data"] //Not the right data to get properties
    console.log("Geojson Data: ", geojsonData)
    console.log("Data: ", )
    const closestPlace   = this.getClosestFeature(coords, geojsonData)
    var Properties     ;
    var assetType      ;
    var sideOfStreet   ;      
    var streetName     ;              
    var Fee            ;
    var maxStay        ;                  
    var timeSpansDays  ;
    var timeSpansDates ;
    try{
      Properties = closestPlace.properties
      assetType = closestPlace.properties.location.assetType
      sideOfStreet = closestPlace.properties.location.sideOfStreet
      streetName = closestPlace.properties.location.streetName
      Fee = closestPlace.properties.regulations[0].payment.rates[0].fees[0]
      maxStay = closestPlace.properties.regulations[0].rule.maxStay
      timeSpansDays =  closestPlace.properties.regulations[0].timeSpans[0].daysOfWeek.days
      timeSpansDates = closestPlace.properties.regulations[0].timeSpans[0].effectiveDates[0]
      console.log("Closest place: ",  closestPlace);
      console.log("Properties: ",     Properties)
      console.log("assetType: ",      assetType)
      console.log("sideOfStreet: ",   sideOfStreet)
      console.log("streetName: ",     streetName)
      console.log("Fee: ",            Fee)
      console.log("maxStay: ",      maxStay)
      console.log("timeSpans: ",    timeSpansDays, timeSpansDates)
    }catch(err) {console.log("error")}

    // var desc = [assetType, sideOfStreet, streetName, Fee, maxStay, timeSpansDates, timeSpansDays]
    var desc = [streetName, Fee, maxStay]
    return desc
  }

  isPointFeature (Feature) {
    return (
        Feature.type === 'Feature'
        && Feature.geometry.type === 'Point'
    );
  }
  
  //https://albertoroura.com/get-closest-feature-featurecollection-given-feature/
  getClosestFeature (coords, FeatureCollection) {
    const lat1 = coords[1];
    const lng1 = coords[0];
    const radLat1 = Math.PI * lat1 / 180;
    const nauticalMileToMile = Math.PI * 60 * 1.1515;

    let lowestValue = 12451; // Earth average longest semicircle
    let closestPlace = null;

    for (const i in FeatureCollection.features) {
        const thisFeature = FeatureCollection.features[i];
        // console.log(i)
        // if (!this.isPointFeature(thisFeature)) { //TODO:
        //     continue;
        // }

        const lng2 = thisFeature.geometry.coordinates[0][0];
        const lat2 = thisFeature.geometry.coordinates[0][1];//TODO: gerer le cas des features differents du Point
        const placeMeta = thisFeature;
        const radLat2 = Math.PI * lat2 / 180;
        const theta = lng1 - lng2;
        const radTheta = Math.PI * theta / 180;

        let dist = Math.sin(radLat1) * Math.sin(radLat2) + Math.cos(radLat1) * Math.cos(radLat2) * Math.cos(radTheta);
        dist = Math.acos(dist) * 180 / nauticalMileToMile;

        if (dist < lowestValue) {
            lowestValue = dist;
            closestPlace = placeMeta;
        }
    }

    return closestPlace;
}

  componentDidMount() {
    this._loadData();

    const map = this._getMap();

    // if (map) {
    //   // TODO doesn't fire due to overlays div
    //   map.on("mouseover", "dataLayer", function(e) {
    //     console.log({ e });
    //     var coordinates = e.features[0].geometry.coordinates.slice();
    //     console.log("coucou: ", coordinates);
        
    //     // Ensure that if the map is zoomed out such that multiple
    //     // copies of the feature are visible, the popup appears
    //     // over the copy being pointed to.
    //     while (Math.abs(e.lngLat.lng - coordinates[0]) > 180) {
    //       coordinates[0] += e.lngLat.lng > coordinates[0] ? 360 : -360;
    //     }
    //     // TODO needs work
    //     // new mapboxgl.Popup()
    //     // .setLngLat(coordinates)
    //     // .setHTML(description)
    //     // .addTo(map);
    //   });
      
    // }
    // if (map) {
    //   map.on('pointermove', function(event) {

    //   });
      
    //   map.getViewport().addEventListener('mouseout', function(evt){
    //       console.info('out');
    //   }, false);
    // }else
    // {console.log("map is null", map)}

    window.onresize = () => {
      const { viewport } = this.state;
      this.setState({
        viewport: {
          ...viewport,
          width: window.innerWidth,
          height: window.innerHeight
        }
      });
    };
  }

  componentWillUnmount() {
    window.onresize = null;
  }

  changeTime = (value: any) => {
    this.setState({ time: value });

    var data = renderCurblrData(
      this.props.curblr.data,
      this.state.day,
      value,
      this.state.mode
    );
    this._setMapData(data);
  };

  changeDay = (value: any) => {
    this.setState({ day: value });

    var data = renderCurblrData(
      this.props.curblr.data,
      value,
      this.state.time,
      this.state.mode
    );
    this._setMapData(data);
  };

  changeMode = (event: any) => {
    this.setState({ mode: event.target.value });

    var data = renderCurblrData(
      this.props.curblr.data,
      this.state.day,
      this.state.time,
      event.target.value
    );
    this._setMapData(data);
  };

  changeGeoData = async (value) => {

    // this.state.old_VS_new_selector = false;//SetState
    this.setState({old_VS_new_selector: false});
    await this.props.dispatch(curblrActions.fetchGeoData(value));
    console.log('day changeGeoData', this.state.day)
    console.log('time changeGeoData', this.state.time)
    console.log('mode changeGeoData', this.state.mode)

    var data = renderCurblrData(
      this.props.curblr.data,
      this.state.day,
      this.state.time,
      this.state.mode
    );
    this._setMapData(data);
  };

  changeGeoDataFromPost = async (data_awaited) => {
  
    // this.state.old_VS_new_selector = true;
    this.setState({old_VS_new_selector: true});
    const data_fetched_njson = await data_awaited;
    var data = renderCurblrData(
      data_fetched_njson,
      this.state.day,
      this.state.time,
      this.state.mode
    );
    this._setMapData(data);
  };
 
  hideComponent(name) {
    switch (name) {
      case "showHideCard":
        this.setState({ showHideCard: !this.state.showHideCard });
        break;
      default:
        null;
    }
  };

  setDateTime = (sl_arrondRef) => {
    this.setState({ sl_arrondRef });
    console.log(`Option selected:`, sl_arrondRef.value);
  };
  
  setArrond = (set_dateTimeRef) => {
    this.setState({ set_dateTimeRef });
    console.log(`Option selected:`, set_dateTimeRef.value);
  };

  sendRequest = async () =>{
    // this.state.old_VS_new_selector = true;//While waiting for response(promise), this creates disparition of data in the card
    // this.setState({old_VS_new_selector: true});// 
    // let uri = "http://127.0.0.1:8081/items";
    let uri = "https://143.198.46.93/";


    const payload = {
      "true_date_time": this.state.set_dateTimeRef,
      "arrond_quartier": this.state.sl_arrondRef,
      "price": 3,
      "minStay": 32
    }
    //TODO: await
    await axios.post(uri, payload)
      .then((response) => {
        console.log(response);
        console.log(response.data);
      
      this.setState({data_to_replace:response.data});
      // this.state.data_to_replace = response.data;//setState
      this.changeGeoDataFromPost(response.data);
      }, (error) => {
        console.log(error);
      });
  };

  handleChange = (name, event) => {
    this.setState({
      [name]: event.target.value
    }, () => {
      console.log(this.state.sl_arrondRef);
      console.log(this.state.set_dateTimeRef)
      // Prints the new value.
    });
  };

  CityInfo = (props) => {
    const {info} = props;
    const displayName = `${info.city}, ${info.state}`;
  
    return (
      <div>
        <div>
          {displayName} |{' '}
          <a
            target="_new"
            href={`http://en.wikipedia.org/w/index.php?title=Special:Search&search=${displayName}`}
          >
            Wikipedia
          </a>
        </div>
        <img width={240} src={info.image} />
      </div>
    );
  }

  ControlPanel = () => {
    return (
      <div className="control-panel">
        <h3>Marker, Popup, NavigationControl and FullscreenControl </h3>
        <p>
          Map showing top 20 most populated cities of the United States. Click on a marker to learn
          more.
        </p>
        <p>
          Data source:{' '}
          <a href="https://en.wikipedia.org/wiki/List_of_United_States_cities_by_population">
            Wikipedia
          </a>
        </p>
        <div className="source-link">
          <a
            href="https://github.com/visgl/react-map-gl/tree/6.1-release/examples/controls"
            target="_new"
          >
            View Code ↗
          </a>
        </div>
      </div>
    );
  }

  // Important for perf: the markers never change, avoid rerender when the map viewport changes
  Pins = (props) => {
    const {data, onClick} = props;

    return data.map((city, index) => (
      <Marker key={`marker-${index}`} longitude={city.longitude} latitude={city.latitude}>
        <svg
          height={SIZE}
          viewBox="0 0 24 24"
          style={{
            cursor: 'pointer',
            fill: '#d00',
            stroke: 'none',
            transform: `translate(${-SIZE / 2}px,${-SIZE}px)`
          }}
          onClick={() => onClick(city)}
        >
          <path d={ICON} />
        </svg>
      </Marker>
    ));
  }

  render() {
    const { viewport,
            mapStyle,
            day,
            time,
            mode,
            showHideCard,
            set_dateTimeRef,
            data_to_replace,
            old_VS_new_selector,
            geocoderContainerRef,
            clickedLong,
            clickedLat,
            // description,
            b_noBorne,
            b_periodes,
            b_tarif,
            b_nomRue
          } = this.state;

  // shows everything. would be great if this could intersect the feature collection with the viewport bounding box. i can't figure it out. for kevin?
  const dt_to_set = (old_VS_new_selector? data_to_replace : this.props.curblr.data);
  const features = renderCurblrData(
      dt_to_set,
      this.state.day,
      this.state.time,
      this.state.mode
    );

  // takes CurbLR feed (loaded into map as a prop, above) and puts it into a "dataUri" that can be downloaded from the export button. (Linking to file pathway doesn't work bc of umi build... couldn't find a static location for the data)
    let curblrStr = JSON.stringify(this.props.curblr.data);
    let curblrDataUri = 'data:application/json;charset=utf-8,'+ encodeURIComponent(curblrStr);
  
    const ACTIVITY_LENGTH_CALC = {
      "no standing": features.features
        .filter(f => f.properties.activity === "no standing")
        .map(f => f.properties.length)
        .reduce((acc, x) => acc + x, 0),
      "no parking": features.features
        .filter(f => f.properties.activity === "no parking")
        .map(f => f.properties.length)
        .reduce((acc, x) => acc + x, 0),
      "passenger loading": features.features
        .filter(f => f.properties.activity === "passenger loading")
        .map(f => f.properties.length)
        .reduce((acc, x) => acc + x, 0),
      "loading": features.features
        .filter(f => f.properties.activity === "loading")
        .map(f => f.properties.length)
        .reduce((acc, x) => acc + x, 0),
      "free parking": features.features
        .filter(f => f.properties.activity === "free parking")
        .map(f => f.properties.length)
        .reduce((acc, x) => acc + x, 0),
      "transit": features.features
        .filter(f => f.properties.activity === "transit")
        .map(f => f.properties.length)
        .reduce((acc, x) => acc + x, 0),
      "paid parking": features.features
        .filter(f => f.properties.activity === "paid parking")
        .map(f => f.properties.length)
        .reduce((acc, x) => acc + x, 0),
      "restricted": features.features
        .filter(f => f.properties.activity === "restricted")
        .map(f => f.properties.length)
        .reduce((acc, x) => acc + x, 0)
    };

    const MAXSTAY_LENGTH_CALC = {
      "3": features.features
        .filter(f => Number(f.properties.maxStay) <= 5)
        .map(f => Number(f.properties.length))
        .reduce((acc, x) => acc + x, 0),
      "15": features.features
        .filter(f => Number(f.properties.maxStay) === 15)
        .map(f => Number(f.properties.length))
        .reduce((acc, x) => acc + x, 0),
      "30": features.features
        .filter(f => Number(f.properties.maxStay) === 30)
        .map(f => Number(f.properties.length))
        .reduce((acc, x) => acc + x, 0),
      //"45": features.features.filter(f => f.properties.maxStay === '45').map(f => f.properties.length).reduce((acc, x) => acc + x, 0),
      "60": features.features
        .filter(f => Number(f.properties.maxStay) === 60)
        .map(f => Number(f.properties.length))
        .reduce((acc, x) => acc + x, 0),
      //"90": features.features.filter(f => f.properties.maxStay === '90').map(f => f.properties.length).reduce((acc, x) => acc + x, 0),
      "120": features.features
        .filter(f => Number(f.properties.maxStay) === 120)
        .map(f => Number(f.properties.length))
        .reduce((acc, x) => acc + x, 0),
      "180": features.features
        .filter(f => Number(f.properties.maxStay) === 180)
        .map(f => Number(f.properties.length))
        .reduce((acc, x) => acc + x, 0),
      "240": features.features
        .filter(f => Number(f.properties.maxStay) >= 240)
        .map(f => Number(f.properties.length))
        .reduce((acc, x) => acc + x, 0)
      //  "360": features.features.filter(f => f.properties.maxStay === '360').map(f => f.properties.length).reduce((acc, x) => acc + x, 0),
      //  "480": features.features.filter(f => f.properties.maxStay === '480').map(f => f.properties.length).reduce((acc, x) => acc + x, 0),
    };

    const activityPieData = [
      {
        x: "No Stopping",
        y: ACTIVITY_LENGTH_CALC["no standing"]
      },
      {
        x: "No Parking",
        y: ACTIVITY_LENGTH_CALC["no parking"]
      },
      {
        x: "Taxi, TNC, Other PUDO",
        y: ACTIVITY_LENGTH_CALC["passenger loading"]
      },
      {
        x: "Loading",
        y: ACTIVITY_LENGTH_CALC["loading"]
      },
      {
        x: "Transit",
        y: ACTIVITY_LENGTH_CALC["transit"]
      },
      {
        x: "Free Parking",
        y: ACTIVITY_LENGTH_CALC["free parking"]
      },
      {
        x: "Paid Parking",
        y: ACTIVITY_LENGTH_CALC["paid parking"]
      },
      {
        x: "Other Restricted Uses",
        y: ACTIVITY_LENGTH_CALC["restricted"]
      }
    ];

    const maxStayPieData = [
      {
        x: "5 min or less",
        y: MAXSTAY_LENGTH_CALC["3"]
      },
      {
        x: "15 min",
        y: MAXSTAY_LENGTH_CALC["15"]
      },
      {
        x: "30 min",
        y: MAXSTAY_LENGTH_CALC["30"]
      },
      // {
      //   x: '45 min',
      //   y: MAXSTAY_LENGTH_CALC['45'],
      // },
      {
        x: "1 hr",
        y: MAXSTAY_LENGTH_CALC["60"]
      },
      // {
      //   x: '90 min',
      //   y: MAXSTAY_LENGTH_CALC['90'],
      // },
      {
        x: "2 hr",
        y: MAXSTAY_LENGTH_CALC["120"]
      },
      {
        x: "3 hr",
        y: MAXSTAY_LENGTH_CALC["180"]
      },
      {
        x: "4 hr or more",
        y: MAXSTAY_LENGTH_CALC["240"]
      }
    ];
   
    const arrondissements_montreal = [
      { label: "plaza", value: "plaza"},
      { label: "Outremont", value: "Outremont"},
      // { label: "LaSalle", value: "LaSalle"},
      // { label: "Mont-Royal", value: "Mont-Royal"},
      // { label: "Ville-Marie", value: "Ville-Marie"},//weird
      { label: "Le Plateau-Mont-Royal", value: "Le Plateau-Mont-Royal"},
      // { label: "Hampstead", value: "Hampstead"},
      { label: "Le Sud-Ouest", value: "Le Sud-Ouest"},
      // { label: "Rivière-des-Prairies-Pointe-aux-Trembles", value: "Rivière-des-Prairies-Pointe-aux-Trembles"},
      { label: "Lachine", value: "Lachine"},
      // { label: "Dorval", value: "Dorval"},
      // { label: "Montréal-Nord", value: "Montréal-Nord"},
      // { label: "L'Île-Bizard-Sainte-Geneviève", value: "L'Île-Bizard-Sainte-Geneviève"},
      // { label: "Kirkland", value: "Kirkland"},
      // { label: "Dollard-des-Ormeaux", value: "Dollard-des-Ormeaux"},
      // { label: "Senneville", value: "Senneville"},
      { label: "Ahuntsic-Cartierville", value: "Ahuntsic-Cartierville"},
      // { label: "Côte-Saint-Luc", value: "Côte-Saint-Luc"},
      // { label: "Saint-Léonard", value: "Saint-Léonard"},
      // { label: "Montréal-Ouest", value: "Montréal-Ouest"},
      // { label: "Pointe-Claire", value: "Pointe-Claire"},
      // { label: "L'Île-Dorval", value: "L'Île-Dorval"},
      { label: "Mercier-Hochelaga-Maisonneuve", value: "Mercier-Hochelaga-Maisonneuve"},
      { label: "Côte-des-Neiges-Notre-Dame-de-Grâce", value: "Côte-des-Neiges-Notre-Dame-de-Grâce"},
      { label: "Rosemont-La Petite-Patrie", value: "Rosemont-La Petite-Patrie"},
      { label: "Saint-Laurent", value: "Saint-Laurent"},
      // { label: "Beaconsfield", value: "Beaconsfield"},
      { label: "Villeray-Saint-Michel-Parc-Extension", value: "Villeray-Saint-Michel-Parc-Extension"},
      // { label: "Westmount", value: "Westmount"},
      // { label: "Montréal-Est", value: "Montréal-Est"},
      // { label: "Anjou", value: "Anjou"},
      // { label: "Pierrefonds-Roxboro", value: "Pierrefonds-Roxboro"},
      // { label: "Sainte-Anne-de-Bellevue", value: "Sainte-Anne-de-Bellevue"},
      { label: "Verdun", value: "Verdun"},
      // { label: "Baie-d'Urfé", value: "Baie-d'Urfé"},
    ];
 
    return (
      <Layout>
        <button onClick={() => this.hideComponent("showHideCard")}>
          Hide/Show Menu
        </button>
    
        <Content>
          <MapGL
            ref={this._mapRef}
            mapboxApiAccessToken={mapboxAccessToken}
            mapStyle={mapStyle}
            {...viewport}
            onViewportChange={(viewport) => this.setState({ viewport })}
            onClick={(evt) => this.onClickMap(evt)}
          >
          <Popup
            latitude={clickedLat}
            longitude={clickedLong}
            closeButton={true}
            closeOnClick={false}
            // onClose={() => togglePopup(false)}
            anchor="top" >
            {/* <div>{description}</div> */}
            {/* <div>Borne: {b_noBorne}</div> */}
            <div>Rue: {b_nomRue}</div>
            <br />
            <div>Tarif horaire: {b_tarif} dollars</div>
            <br />
            {/* <div>Périodes tarifées: </div>
            <div>{b_periodes}</div> */}
            
          </Popup>
            <div style={{ width: "40px" }}>
              {/* , right:"40px", position:"fixed"}}> */}
              <GeolocateControl style={geolocateStyle} />
              {/* <FullscreenControl style={fullscreenControlStyle} />
              <NavigationControl style={navStyle} />
              <ScaleControl style={scaleControlStyle} /> */}
            </div>
          </MapGL>
          <div
            ref={geocoderContainerRef}
            style={{ position: "absolute", top: 20, left: 20, zIndex: 1 }}
          />
        </Content>
        {showHideCard && (
          <Card
            size="small"
            title="Stationnements Montréal et Québec, QC"
            bordered={true}
            style={{
              position: "fixed",
              top: "40px",
              left: "40px",
              width: "350px",
              height: "auto",
              maxHeight: "100vh",
              overflow: "auto",
            }}
          >
            <br />
            &nbsp; &nbsp;Arrondissement/quartier à afficher:{" "}
            <Select
              onChange={this.changeGeoData}
              style={{
                // position: "fixed",
                // top: "40px",
                // left: "40px",
                width: "275px",
              }}
            >
              {React.Children.toArray(
                geoDataFiles.map((f) => (
                  <Select.Option value={f.path}>{f.label}</Select.Option>
                ))
              )}
            </Select>
            <br />
            <br />
            &nbsp; &nbsp;Day:{" "}
            <Select defaultValue={day} onChange={this.changeDay}>
              <Select.Option value="mo">Monday</Select.Option>
              <Select.Option value="tu">Tuesday</Select.Option>
              <Select.Option value="we">Wednesday</Select.Option>
              <Select.Option value="th">Thursday</Select.Option>
              <Select.Option value="fr">Friday</Select.Option>
              <Select.Option value="sa">Saturday</Select.Option>
              <Select.Option value="su">Sunday</Select.Option>
            </Select>
            &nbsp; &nbsp;Time:{" "}
            <Select
              defaultValue={time}
              onChange={this.changeTime}
              style={{
                // position: "fixed",
                // top: "40px",
                // left: "40px",
                width: "85px",
              }}
            >
              <Select.Option value="00:01">00:00</Select.Option>
              <Select.Option value="01:01">01:00</Select.Option>
              <Select.Option value="02:01">02:00</Select.Option>
              <Select.Option value="03:01">03:00</Select.Option>
              <Select.Option value="04:01">04:00</Select.Option>
              <Select.Option value="05:01">05:00</Select.Option>
              <Select.Option value="06:01">06:00</Select.Option>
              <Select.Option value="07:01">07:00</Select.Option>
              <Select.Option value="08:01">08:00</Select.Option>
              <Select.Option value="09:01">09:00</Select.Option>
              <Select.Option value="10:01">10:00</Select.Option>
              <Select.Option value="11:01">11:00</Select.Option>
              <Select.Option value="12:01">12:00</Select.Option>
              <Select.Option value="13:01">13:00</Select.Option>
              <Select.Option value="14:01">14:00</Select.Option>
              <Select.Option value="15:01">15:00</Select.Option>
              <Select.Option value="16:01">16:00</Select.Option>
              <Select.Option value="17:01">17:00</Select.Option>
              <Select.Option value="18:01">18:00</Select.Option>
              <Select.Option value="19:01">19:00</Select.Option>
              <Select.Option value="20:01">20:00</Select.Option>
              <Select.Option value="21:01">21:00</Select.Option>
              <Select.Option value="22:01">22:00</Select.Option>
              <Select.Option value="23:01">23:00</Select.Option>
            </Select>
            <br />
            <br />
            &nbsp; &nbsp;View by:{" "}
            <Radio.Group
              defaultValue={mode}
              buttonStyle="solid"
              position="center"
              onChange={this.changeMode}
            >
              <Radio.Button value="activity">Activity</Radio.Button>
              <Radio.Button value="maxStay">Max Stay</Radio.Button>
            </Radio.Group>
            <br />
            <br />
            {mode === "maxStay" ? (
              <Pie
                animate={false}
                colors={Object.values(MAXSTAY_COLOR_MAP)}
                hasLegend
                title="Maximum Stay"
                subTitle={
                  <>
                    Total car
                    <br />
                    lengths
                  </>
                }
                total={() => (
                  <>
                    <span>
                      {(
                        maxStayPieData.reduce((pre, now) => now.y + pre, 0) /
                        avgParkingLength
                      ).toLocaleString("en", {
                        style: "decimal",
                        maximumFractionDigits: 0,
                        minimumFractionDigits: 0,
                      })}
                    </span>
                  </>
                )}
                data={maxStayPieData}
                valueFormat={(val) => (
                  <span>
                    {(val / avgParkingLength).toLocaleString("en", {
                      style: "decimal",
                      maximumFractionDigits: 0,
                      minimumFractionDigits: 0,
                    })}{" "}
                    cars
                  </span>
                )}
                height={240}
              />
            ) : (
              <Pie
                animate={false}
                colors={Object.values(ACTIVITY_COLOR_MAP)}
                hasLegend
                title="Activities"
                subTitle={
                  <>
                    Total car
                    <br />
                    lengths
                  </>
                }
                total={() => (
                  <>
                    <span>
                      {(
                        activityPieData.reduce((pre, now) => now.y + pre, 0) /
                        avgParkingLength
                      ).toLocaleString("en", {
                        style: "decimal",
                        maximumFractionDigits: 0,
                        minimumFractionDigits: 0,
                      })}
                    </span>
                  </>
                )}
                data={activityPieData}
                valueFormat={(val) => (
                  <span>
                    {(val / avgParkingLength).toLocaleString("en", {
                      style: "decimal",
                      maximumFractionDigits: 0,
                      minimumFractionDigits: 0,
                    })}{" "}
                    cars
                  </span>
                )}
                height={240}
              />
            )}
            <br />
            <Button
              type="primary"
              icon="download"
              block
              href={curblrDataUri}
              download="export.curblr.json"
            >
              Download CurbLR data
            </Button>
            <br />
            <br />
            <p style={{ "font-size": "11px" }}>
              Données de stationnements des villes{" "}
              <a href="https://donnees.montreal.ca/ville-de-montreal/stationnement-sur-rue-signalisation-courant">
                {" "}
                de Montréal{" "}
              </a>{" "}
              et de
              <a href="https://www.donneesquebec.ca/recherche/fr/dataset/vque_7">
                {" "}
                de Québec{" "}
              </a>
            </p>
          </Card>
        )}
    
        {/* {showHideCard && (
          <Card
            size="small"
            title="Filter"
            bordered={true}
            style={{
              position: "fixed",
              // top: "80px",
              bottom: "80px",
              right: "40px",
              width: "auto",
              height: "auto",
              maxHeight: "100vh",
              overflow: "auto",
            }}
          >
            <div>
              <Geocoder
                mapRef={this._mapRef}
                containerRef={geocoderContainerRef}
                onViewportChange={(viewport) => this.setState({ viewport })}
                mapboxApiAccessToken={mapboxAccessToken}
              />
            </div>
            <div>
              <label htmlFor="sl_arrondissement">Arrondissement: </label>
              <select
                id="sl_arrondissement"
                // onChange={this.setArrond}
                onChange={(event) => this.handleChange("sl_arrondRef", event)}
              >
                {arrondissements_montreal.map((option) => (
                  <option value={option.value}>{option.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label
                htmlFor="dt_picker"
                style={{
                  textAlign: "justify",
                }}
              >
                Date et heure:{" "}
              </label>
              <DateTimePickerComponent
                placeholder="Choose a date and time"
                value={set_dateTimeRef}
                // min={minDate}
                // max={maxDate}
                id="dt_picker"
                format="dd-MMM-yy HH:mm"
                step={15}
                onChange={(event) => this.handleChange("set_dateTimeRef", event)}
              ></DateTimePickerComponent>
            </div>
            <div>
              <Button type="primary" icon="search" onClick={this.sendRequest}>
                Filtrer
              </Button>
            </div>
          </Card>
        )}
     */}
        <Button
          size="small"
          type="primary"
          href="https://wiki.lafabriquedesmobilites.fr/wiki/Carte_CurbLR_de_Montr%C3%A9al"
          style={{
            position: "fixed",
            bottom: "40px",
            right: "40px",
          }}
        >
          Plus d'informations sur la carte ici
        </Button>
      </Layout>
    );
    
  }
}

export default connect(mapStateToProps)(Map);
