import json

ville_marie_quartiers = [
    "DOWNTOWN",
    "QUARTIER DES SPECTACLES",
    "GAY VILLAGE",
    "OLD MONTREAL",
    "JEAN-DRAPEAU",
]
ls = [
 "mtl-subset-segment-downtown.curblr.json",
 "mtl-parco-DOWNTOWN.filtred.curblr.json",

 "mtl-subset-segment-gay-village.curblr.json",
 "mtl-parco-GAY-VILLAGE.filtred.curblr.json",
 
 "mtl-subset-segment-jean-drapeau.curblr.json",
 
 "mtl-subset-segment-old-montreal.curblr.json",
 "mtl-parco-OLD-MONTREAL.filtred.curblr.json",
 
 "mtl-subset-segment-quartier-des-spectacles.curblr.json",
 "mtl-parco-QUARTIER-DES-SPECTACLES.filtred.curblr.json",
]
 
PATH = "src/assets/data/"
with open(PATH + ls[7], "r") as f1, open(PATH + ls[8], "r") as f2:
    signalec = json.load(f1)
    parco = json.load(f2)
    data = signalec
    data["features"] = signalec["features"] + parco["features"]
    with open(PATH + ls[7].replace("subset", "fusion"), "w") as f3:
        json.dump(data, f3)