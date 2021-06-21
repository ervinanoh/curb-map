import { GlobalState } from "../common/types";
import { DvaModelBuilder } from "dva-model-creator";
import { time, day, priority, activity } from "../actions/filter";
import { fetchGeoData, loadGeoData } from "../actions/geo"
import geojsonData from '@/assets/data/mtl-parco-GAY-VILLAGE.filtred.curblr.json';
import { CurbFeature, CurbFeatureCollection, filterTimeAndDay } from '@/common/curblr';
import { FeatureCollection, featureCollection, feature, LineString } from '@turf/helpers';
import {fromJS} from 'immutable';
import mapStyle from '../assets/style.json';
import { gapi } from 'gapi-script';


// fix to avoid useless warnings about action type namespace
const errorLog = console.error;
console.error = (...args : any[]) => {
    if (args[0] && args[0].indexOf('[sagaEffects.put]') === -1) {
        errorLog.call(console, ...args);
    }
};

const geoDataFiles = [
    // // Autres
    // `DOWNTOWN",
    //         "QUARTIER DES SPECTACLES",
    //         "GAY VILLAGE",
    //         "OLD MONTREAL",
    //         "JEAN-DRAPEAU",
    { path: "mtl-parco-DOWNTOWN.filtred.curblr.json", label: "Ville-Marie parco - Downtown"},
    { path: "mtl-subset-segment-downtown.curblr.json", label: "Ville-Marie - Downtown"},
    { path: "mtl-parco-GAY-VILLAGE.filtred.curblr.json", label: "Ville-Marie parco - Gay Village"},
    { path: "mtl-subset-segment-gay-village.curblr.json", label: "Ville-Marie - Gay Village"},
    { path: "mtl-parco-OLD-MONTREAL.filtred.curblr.json", label: "Ville-Marie parco - Old Montreal"},
    { path: "mtl-subset-segment-old-montreal.curblr.json", label: "Ville-Marie - Old Montreal"},
    { path: "mtl-parco-QUARTIER-DES-SPECTACLES.filtred.curblr.json", label: "Ville-Marie parco - Quartier Des Spectacles"},
    { path: "mtl-subset-segment-quartier-des-spectacles.curblr.json", label: "Ville-Marie - Quartier Des Spectacles"},
    { path: "mtl-subset-segment-jean-drapeau.curblr.json", label: "Ville-Marie - Jean-Drapeau (pas de parcos)"},
];

const curblrData = geojsonData as CurbFeatureCollection;

const initState:GlobalState = {
    curblr: {
        time: "08:01",
        day: "mo",
        mode: "time",
        data: curblrData
    }
}

async function loadAsset(path : string){
    //../assets/data/
    // little hack, reading the file from github
    //https://raw.githubusercontent.chubusercontent.com/ervinanoh/curb-map/master/src/assets/data/${path}`);
    // const data = await response.json();om/ervinanoh/curb-map/master/src/assets/data/
    //or with google drive https://drive.google.com/uc?export=download&id=
    
    // const response = await fetch(`https://raw.githubusercontent.com/ervinanoh/curb-map/master/src/assets/data/${path}`);
    // const data = await response.json();
    // this.setState({ totalReactPackages: data.total })
    // return data;
    return await import(`../assets/data/${path}`)
}

const builder = new DvaModelBuilder(initState, "curblr")
    .takeLatest(fetchGeoData, function* (payload, { call, put }) {
        const geoData = yield call(loadAsset, payload);
        yield put(loadGeoData(geoData));
    })
    .case(loadGeoData, (state, payload) => {
        return {
            curblr:{
                time: state.curblr.time,
                day: state.curblr.day,
                mode: state.curblr.mode,
                data: payload
            }
        }
    });

export default builder.build();

export const actions = {
    time,
    day,
    fetchGeoData
};


export { geoDataFiles }