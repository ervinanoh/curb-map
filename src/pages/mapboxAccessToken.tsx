import {
  CurbFeatureCollection,
  filterCurblrData //TODO FILTER DAY MONTH
} from "@/common/curblr";
import { GlobalState } from "@/common/types";
import {
  feature, FeatureCollection,
  featureCollection,

  LineString
} from "@turf/helpers";
import { Layout } from "antd";
import { fromJS } from "immutable";
import mapStyle from "../assets/style.json";

export var mapboxAccessToken = "pk.eyJ1Ijoic2FhZGlxbSIsImEiOiJjamJpMXcxa3AyMG9zMzNyNmdxNDlneGRvIn0.wjlI8r1S_-xxtq2d-W5qPA";
export const { Content } = Layout;
//loads map style
export const defaultMapStyle = fromJS(mapStyle);
//sunset
// const MAXSTAY_COLOR_MAP:{ [key: string]: any } = {
//     "3": "#FFDF00",
//     "15": "#F1B408",
//     "30": "#F1871C",
//     "60": "#F06121",
//     "120": "#F12627",
//     "180": "#C80286",
//     "240": "#63238A",
// }
//opposite of sunset
// const MAXSTAY_COLOR_MAP:{ [key: string]: any } = {
//     "3": "#FFDF00",
//     "15": "#8BBA25",
//     "30": "#018D5A",
//     "60": "#00A8C4",
//     "120": "#1078C3",
//     "180": "#4336A2",
//     "240": "#6D238A",
// }
//blues
export const MAXSTAY_COLOR_MAP: { [key: string]: any; } = {
  "3": "#e1f5fe",
  "15": "#81d4fa",
  "30": "#4fc3f7",
  "60": "#03a9f4",
  "120": "#0277bd",
  "180": "#01579b",
  "240": "#00345D"
};
//greens
// const MAXSTAY_COLOR_MAP:{ [key: string]: any } = {
//     "3": "#ffee58",
//     "15": "#cddc39",
//     "30": "#7cb342",
//     "60": "#689f38",
//     "120": "#388e3c",
//     "180": "#1b5e20",
//     "240": "#124116",
// }
export const ACTIVITY_COLOR_MAP = {
  "no standing": "#777777",
  "no parking": "#DD2C00",
  "passenger loading": "#FF9100",
  "loading": "#FFEA00",
  "transit": "#37B34A",
  "free parking": "#00E5FF",
  "paid parking": "#2979FF",
  "restricted": "#AA00FF"
};
const scaledWidth = (width: number) => {
  return {
    type: "exponential",
    base: 2,
    stops: [
      [12, width * Math.pow(2, 12 - 16)],
      [16, width * Math.pow(2, 16 - 16)]
    ]
  };
};
export const dataLayer = fromJS({
  id: "dataLayer",
  source: "curblrData",
  type: "line",
  interactive: true,
  paint: {
    "line-color": ["get", "color"],
    "line-offset": ["get", "offset"],
    "line-width": scaledWidth(6.8)
  }
});
// sets average parking length (roughly 7m, per NACTO) for use in estimating length in # of parking spaces
export const avgParkingLength = 7;
//
export const ICON = `M20.2,15.7L20.2,15.7c1.1-1.6,1.8-3.6,1.8-5.7c0-5.6-4.5-10-10-10S2,4.5,2,10c0,2,0.6,3.9,1.6,5.4c0,0.1,0.1,0.2,0.2,0.3
c0,0,0.1,0.1,0.1,0.2c0.2,0.3,0.4,0.6,0.7,0.9c2.6,3.1,7.4,7.6,7.4,7.6s4.8-4.5,7.4-7.5c0.2-0.3,0.5-0.6,0.7-0.9
C20.1,15.8,20.2,15.8,20.2,15.7z`;
export const SIZE = 20;
export const geolocateStyle = {
  position: "fixed",
  top: 0,
  // right: 0,
  padding: '10px',
  // width: "60px"
};
export const fullscreenControlStyle = {
  position: "fixed",
  top: 36,
  // left: 0,
  padding: '10px',
  // width: "60px"
};
export const navStyle = {
  position: "fixed",
  top: 72,
  // left: 0,
  padding: '10px',
  // width: "60px"
};
export const scaleControlStyle = {
  position: "fixed",
  bottom: 36,
  // left: 0,
  padding: '10px',
  // width: "60px"
};
export const renderCurblrData = (
  data: CurbFeatureCollection,
  day: string,
  time: string,
  filterType: string
): FeatureCollection<LineString> => {
  var renderData = featureCollection<LineString>([]);
  var filteredData = filterCurblrData(data, day, time); //TODO FILTER DAY MONTH

  for (var curbFeature of filteredData.features) {
    var renderFeature = feature<LineString>(curbFeature.geometry);
    renderFeature.properties = {};

    for (var regulation of curbFeature.properties.regulations) {
      // marks each feature with its length
      renderFeature.properties.length =
        curbFeature.properties.location.shstLocationEnd -
        curbFeature.properties.location.shstLocationStart;

      renderFeature.properties.priority = regulation.priority;

      // if(priority) {
      var offsetPriority = 0;
      //offsetPriority = (10 * priority);
      var baseOffset = 10 + offsetPriority;
      if (curbFeature.properties.location.sideOfStreet === "left")
        baseOffset = 0 - 10 - offsetPriority;

      renderFeature.properties["offset"] = baseOffset; //scaledOffset(baseOffset);

      if (filterType === "maxStay") {
        if (regulation.rule.maxStay) {
          var maxStay = regulation.rule.maxStay + "";
          if (MAXSTAY_COLOR_MAP[maxStay]) {
            renderFeature.properties["color"] = MAXSTAY_COLOR_MAP[maxStay];
            renderFeature.properties.maxStay = maxStay;
            renderData.features.push(renderFeature);
          }
        }
      }


      // Splits out common activities and variants for an overall view. Features that fall into more than one "bucket" are duplicated, but handled by ensuring that they ultimately fall into the more specific bucket via painter's algorithm.
      // Requires ts.3.7 because of null arrays - I lucked out on mine but this will break on a different environment
      else if (filterType === "activity") {

        if (regulation.rule.activity === "no parking") {
          renderFeature.properties["color"] =
            ACTIVITY_COLOR_MAP["no parking"];
          // set the activty to use later in hooking up chart to map data
          renderFeature.properties.activity = "no parking";
          renderData.features.push(renderFeature);
        }
        if (regulation.rule.activity === "no standing") {
          renderFeature.properties["color"] =
            ACTIVITY_COLOR_MAP["no standing"];
          // set the activty to use later in hooking up chart to map data
          renderFeature.properties.activity = "no standing";
          renderData.features.push(renderFeature);
        }
        if (regulation.rule.activity === "parking" &&
          !regulation.rule.payment &&
          !regulation.userClasses?.some(uc => uc.classes?.length > 0)) {
          renderFeature.properties["color"] =
            ACTIVITY_COLOR_MAP["free parking"];
          renderFeature.properties.activity = "free parking";
          renderData.features.push(renderFeature);
        }
        if (regulation.rule.activity === "parking" &&
          regulation.rule.payment &&
          !regulation.userClasses?.some(uc => uc.classes?.length > 0)) {
          renderFeature.properties["color"] =
            ACTIVITY_COLOR_MAP["paid parking"];
          renderFeature.properties.activity = "paid parking";
          renderData.features.push(renderFeature);
        }
        if (regulation.rule.activity === "loading") {
          renderFeature.properties["color"] = ACTIVITY_COLOR_MAP["loading"];
          renderFeature.properties.activity = "loading";
          renderData.features.push(renderFeature);
        }
        if (regulation.userClasses?.some(uc => [
          "motorcycle",
          "hotel guest",
          "permit",
          "reserved",
          "handicap",
          "scooter",
          "bicycle",
          "USPS",
          "car share",
          "police",
          "tour bus"
        ].some(c => uc.classes?.includes(c))
        )) {
          renderFeature.properties["color"] =
            ACTIVITY_COLOR_MAP["restricted"];
          renderFeature.properties.activity = "restricted";
          renderData.features.push(renderFeature);
        }
        if (regulation.userClasses?.some(uc => ["taxi", "passenger", "TNC", "rideshare"].some(c => uc.classes?.includes(c)
        )
        )) {
          renderFeature.properties["color"] =
            ACTIVITY_COLOR_MAP["passenger loading"];
          renderFeature.properties.activity = "passenger loading";
          renderData.features.push(renderFeature);
        }
        if (regulation.userClasses?.some(uc => uc.classes?.includes("transit"))) {
          renderFeature.properties["color"] = ACTIVITY_COLOR_MAP["transit"];
          renderFeature.properties.activity = "transit";
          renderData.features.push(renderFeature);
        }
      }
    }
  }

  return renderData;
};
export const mapStateToProps = (d: GlobalState) => {
  return d.curblr;
};
type PageStateProps = ReturnType<typeof mapStateToProps>;
export type PageProps = PageStateProps;
