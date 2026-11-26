// Données fictives du mode démonstration (core/demo.js) : ce que lisent les fenêtres en jeu quand le tutoriel les
// montre dans la fenêtre principale. Fabriquées à partir de vraies réponses de l'app, puis rendues anonymes : commandant
// « Testeur », « Système Test », « Station Test », coordonnées décalées, identifiants refaits, listes raccourcies.
// Aucune donnée d'un joueur réel. Fichier généré : on ne le modifie pas à la main (scripts de fabrication hors dépôt,
// contrôle dans core/demo.test.js et par l'étape 60-anonymat de npm run controle).

export const DONNEES = {
 "/modules/hudcolours/teinte": {
  "suivre": true,
  "identite": true,
  "couleurs": {
   "acc": [
    255,
    154,
    60
   ],
   "acc2": [
    255,
    138,
    31
   ],
   "clair": [
    255,
    208,
    138
   ]
  }
 },
 "/modules/colonisation/active": null,
 "/overlay/suggest": null,
 "/overlay/switch": null,
 "/modules/combat/session": {
  "startedAt": "2026-11-16T18:24:34Z",
  "kills": 14,
  "credits": 6420000,
  "bounties": {
   "total": 5180000,
   "count": 12
  },
  "bonds": {
   "total": 1240000,
   "count": 2
  },
  "capShip": {
   "total": 0,
   "count": 0
  },
  "pvp": 0,
  "merits": {
   "combat": 3250,
   "other": 0
  },
  "deaths": 0,
  "lastKillAt": "2026-11-14T19:57:00Z",
  "recent": [],
  "vaisseau": {
   "seuil": 40,
   "nom": "Type-11 Rhino",
   "coque": 100,
   "coqueAt": "2026-11-16T18:24:52Z",
   "coqueDirect": false,
   "boucliers": true,
   "bouclierAt": "2026-11-15T19:02:42Z",
   "releveAt": "2026-11-16T18:24:52Z",
   "modules": [
    {
     "nom": "Analyseur de sillage · utilitaire 1",
     "sante": 100
    },
    {
     "nom": "Approche planétaire",
     "sante": 100
    },
    {
     "nom": "Capteurs",
     "sante": 100
    },
    {
     "nom": "Contrôleur de drones",
     "sante": 100
    },
    {
     "nom": "Distributeur",
     "sante": 100
    },
    {
     "nom": "Écoutille de soute",
     "sante": 100
    },
    {
     "nom": "FSD",
     "sante": 100
    },
    {
     "nom": "Générateur",
     "sante": 100
    },
    {
     "nom": "Générateur de boucliers",
     "sante": 100
    },
    {
     "nom": "Hangar SRV",
     "sante": 100
    },
    {
     "nom": "Laser à rayon · petit 3",
     "sante": 100
    },
    {
     "nom": "Multicanon · moyen 3",
     "sante": 100
    },
    {
     "nom": "Multicanon · petit 2",
     "sante": 100
    },
    {
     "nom": "Multicanon · petit 4",
     "sante": 100
    }
   ],
   "sousSeuil": [],
   "coqueBasse": false,
   "alerte": false
  },
  "pausedMs": 0,
  "pausedSince": "2026-11-16T18:24:52.000Z",
  "pauseReason": "docked",
  "chronoFrom": null,
  "chronoPausedMs": 0
 },
 "/modules/glance/summary": {
  "commander": "Testeur",
  "credits": {
   "balance": 626187180,
   "at": "2026-11-16T18:25:13Z"
  },
  "powerplay": {
   "power": "Aisling Duval",
   "rank": 193,
   "merits": 1524285,
   "at": "2026-11-16T18:24:52Z"
  },
  "system": {
   "name": "Système Test",
   "at": "2026-11-16T18:24:52Z",
   "state": "Exploited",
   "label": "Exploité",
   "power": "Aisling Duval",
   "progress": 1.023857,
   "points": 358350,
   "tier": 350000,
   "erosion": null,
   "erosionVerifiee": true,
   "next": "Consolidé",
   "reinforcement": 104841,
   "undermining": 15091,
   "conflict": [],
   "previous": {
    "at": "2026-11-15T19:37:35Z",
    "label": "Exploité",
    "points": 349680,
    "conflict": []
   },
   "change": {
    "points": 8670,
    "since": "2026-11-15T19:37:35Z"
   }
  },
  "merc": {
   "value": null,
   "updatedAt": null,
   "source": "saisie manuelle (absent du journal)"
  },
  "toCash": {
   "bounties": 0,
   "bonds": 0,
   "exploration": {
    "systems": 3,
    "bodies": 28,
    "value": 36832
   },
   "exobiology": {
    "count": 0,
    "value": 0,
    "unknownValues": 0,
    "items": []
   },
   "lostAt": "2026-11-11T20:14:01Z"
  },
  "cargo": {
   "count": 0,
   "items": [],
   "powerplay": []
  },
  "missions": [
   {
    "name": "Livraison de données à Station Test"
   },
   {
    "name": "Élimination de pirates"
   }
  ],
  "locker": {
   "items": 0,
   "components": 1000,
   "consumables": 288,
   "data": 0,
   "at": "2026-11-16T18:24:52Z"
  },
  "goals": [],
  "rebuy": {
   "ship": {
    "label": "Type-11 Rhino (Type-11 Prospector)",
    "type": "lakonminer",
    "at": "2026-11-16T18:24:52Z"
   },
   "rebuy": 4559331,
   "estimated": false,
   "balance": 626187180,
   "covered": true,
   "missing": 0,
   "times": 137,
   "alert": null,
   "docked": true,
   "atStake": {
    "total": 4596163,
    "rebuy": 4559331,
    "toCash": 36832,
    "cargo": 0,
    "unpriced": [],
    "missionTons": 0
   },
   "mode": {
    "mode": "Open",
    "group": null,
    "label": "Open",
    "open": true,
    "at": "2026-11-16T18:24:34Z"
   },
   "resurrect": {
    "at": "2026-11-11T20:14:32Z",
    "seenAt": 1794428072000,
    "option": "rejoin",
    "optionStatus": "mesurée",
    "cost": 0,
    "expectedCost": null,
    "bankrupt": false,
    "text": "Retour au vaisseau, sans frais (mort hors du vaisseau).",
    "loss": null,
    "recent": false
   }
  },
  "communityGoals": {
   "at": "2026-11-12T10:02:01Z",
   "alertHours": 24,
   "active": [],
   "toClaim": [
    {
     "id": 1001,
     "title": "Opération commerciale de Faulcon DeLacy",
     "system": "Système Test E",
     "station": "Station Test E",
     "expiry": "2026-10-29T10:00:00Z",
     "hoursLeft": 0,
     "status": "claim",
     "contribution": 789,
     "contributors": 13931,
     "total": 102482894,
     "band": 75,
     "inTopRank": false,
     "topRankSize": 10,
     "tier": 3,
     "tierName": "Tier 3",
     "topTier": 6,
     "reward": 170000000,
     "noContribution": false,
     "zeroAlert": false,
     "at": "2026-11-12T10:02:01Z",
     "claimAt": {
      "station": "Station Test E",
      "system": "Système Test E"
     }
    }
   ]
  },
  "reminders": [
   {
    "level": "warning",
    "text": "Récompense d'objectif communautaire à réclamer à Station Test E (Système Test E) : « Opération commerciale de Faulcon DeLacy », 170 M cr."
   }
  ]
 },
 "/modules/engineering/inventory": {
  "at": "2026-11-16T18:24:34Z",
  "lastAt": "2026-11-16T18:24:34Z",
  "items": [
   {
    "key": "niobium",
    "label": "Niobium",
    "english": "Niobium",
    "type": "Raw",
    "typeLabel": "Matière première",
    "category": "1",
    "grade": 3,
    "count": 200,
    "max": 200,
    "method": "Collecte en surface (SRV) sur affleurements et sites géologiques ; minage"
   },
   {
    "key": "cadmium",
    "label": "Cadmium",
    "english": "Cadmium",
    "type": "Raw",
    "typeLabel": "Matière première",
    "category": "3",
    "grade": 3,
    "count": 200,
    "max": 200,
    "method": "Collecte en surface (SRV) sur affleurements et sites géologiques ; minage"
   },
   {
    "key": "arsenic",
    "label": "Arsenic",
    "english": "Arsenic",
    "type": "Raw",
    "typeLabel": "Matière première",
    "category": "6",
    "grade": 2,
    "count": 15,
    "max": 250,
    "method": "Collecte en surface (SRV) sur affleurements et sites géologiques ; minage"
   },
   {
    "key": "polonium",
    "label": "Polonium",
    "english": "Polonium",
    "type": "Raw",
    "typeLabel": "Matière première",
    "category": "6",
    "grade": 4,
    "count": 15,
    "max": 150,
    "method": "Collecte en surface (SRV) : sites géologiques et cristaux ; récompenses de missions"
   },
   {
    "key": "zirconium",
    "label": "Zirconium",
    "english": "Zirconium",
    "type": "Raw",
    "typeLabel": "Matière première",
    "category": "7",
    "grade": 2,
    "count": 25,
    "max": 250,
    "method": "Collecte en surface (SRV) sur affleurements et sites géologiques ; minage"
   },
   {
    "key": "tin",
    "label": "Étain",
    "english": "Tin",
    "type": "Raw",
    "typeLabel": "Matière première",
    "category": "4",
    "grade": 3,
    "count": 200,
    "max": 200,
    "method": "Collecte en surface (SRV) sur affleurements et sites géologiques ; minage"
   },
   {
    "key": "technetium",
    "label": "Technétium",
    "english": "Technetium",
    "type": "Raw",
    "typeLabel": "Matière première",
    "category": "2",
    "grade": 4,
    "count": 38,
    "max": 150,
    "method": "Collecte en surface (SRV) : sites géologiques et cristaux ; récompenses de missions"
   },
   {
    "key": "chromium",
    "label": "Chrome",
    "english": "Chromium",
    "type": "Raw",
    "typeLabel": "Matière première",
    "category": "2",
    "grade": 2,
    "count": 238,
    "max": 250,
    "method": "Collecte en surface (SRV) sur affleurements et sites géologiques ; minage"
   },
   {
    "key": "vanadium",
    "label": "Vanadium",
    "english": "Vanadium",
    "type": "Raw",
    "typeLabel": "Matière première",
    "category": "1",
    "grade": 2,
    "count": 230,
    "max": 250,
    "method": "Collecte en surface (SRV) sur affleurements et sites géologiques ; minage"
   },
   {
    "key": "mercury",
    "label": "Mercure",
    "english": "Mercury",
    "type": "Raw",
    "typeLabel": "Matière première",
    "category": "6",
    "grade": 3,
    "count": 33,
    "max": 200,
    "method": "Collecte en surface (SRV) sur affleurements et sites géologiques ; minage"
   },
   {
    "key": "iron",
    "label": "Fer",
    "english": "Iron",
    "type": "Raw",
    "typeLabel": "Matière première",
    "category": "4",
    "grade": 1,
    "count": 263,
    "max": 300,
    "method": "Collecte en surface (SRV) sur affleurements et sites géologiques ; minage"
   },
   {
    "key": "yttrium",
    "label": "Yttrium",
    "english": "Yttrium",
    "type": "Raw",
    "typeLabel": "Matière première",
    "category": "1",
    "grade": 4,
    "count": 107,
    "max": 150,
    "method": "Collecte en surface (SRV) : sites géologiques et cristaux ; récompenses de missions"
   },
   {
    "key": "carbon",
    "label": "Carbone",
    "english": "Carbon",
    "type": "Raw",
    "typeLabel": "Matière première",
    "category": "1",
    "grade": 1,
    "count": 68,
    "max": 300,
    "method": "Collecte en surface (SRV) sur affleurements et sites géologiques ; minage"
   },
   {
    "key": "tungsten",
    "label": "Tungstène",
    "english": "Tungsten",
    "type": "Raw",
    "typeLabel": "Matière première",
    "category": "5",
    "grade": 3,
    "count": 200,
    "max": 200,
    "method": "Collecte en surface (SRV) sur affleurements et sites géologiques ; minage"
   }
  ],
  "absents": [
   {
    "key": "germanium",
    "label": "Germanium",
    "english": "Germanium",
    "absent": true,
    "type": "Raw",
    "typeLabel": "Matière première",
    "category": "5",
    "grade": 2,
    "count": 0,
    "max": 250,
    "method": "Collecte en surface (SRV) sur affleurements et sites géologiques ; minage"
   },
   {
    "key": "militarygradealloys",
    "label": "Military Grade Alloys",
    "english": "Military Grade Alloys",
    "absent": true,
    "type": "Manufactured",
    "typeLabel": "Manufacturé",
    "category": "Thermic",
    "grade": 5,
    "count": 0,
    "max": 100,
    "method": "HGE dans les systèmes en guerre ou en guerre civile"
   },
   {
    "key": "legacyfirmware",
    "label": "Specialised Legacy Firmware",
    "english": "Specialised Legacy Firmware",
    "absent": true,
    "type": "Encoded",
    "typeLabel": "Données",
    "category": "Encoded Firmware",
    "grade": 1,
    "count": 0,
    "max": 300,
    "method": "Points de données de sites planétaires"
   },
   {
    "key": "disruptedwakeechoes",
    "label": "Atypical Disrupted Wake Echoes",
    "english": "Atypical Disrupted Wake Echoes",
    "absent": true,
    "type": "Encoded",
    "typeLabel": "Données",
    "category": "Wake Scans",
    "grade": 1,
    "count": 0,
    "max": 300,
    "method": "Scan des sillages de vaisseaux (scanner de sillage FSD) près des grandes stations"
   },
   {
    "key": "unknownshipsignature",
    "label": "Thargoid Ship Signature",
    "english": "Thargoid Ship Signature",
    "absent": true,
    "type": "Encoded",
    "typeLabel": "Données",
    "category": "None",
    "grade": 3,
    "count": 0,
    "max": 200,
    "method": "Débris et sites thargoïdes, zones de conflit AX"
   },
   {
    "key": "unknownwakedata",
    "label": "Thargoid Wake Data",
    "english": "Thargoid Wake Data",
    "absent": true,
    "type": "Encoded",
    "typeLabel": "Données",
    "category": "None",
    "grade": 4,
    "count": 0,
    "max": 150,
    "method": "Débris et sites thargoïdes, zones de conflit AX"
   },
   {
    "key": "ancientlanguagedata",
    "label": "Pattern Delta Obelisk Data",
    "english": "Pattern Delta Obelisk Data",
    "absent": true,
    "type": "Encoded",
    "typeLabel": "Données",
    "category": "None",
    "grade": 4,
    "count": 0,
    "max": 150,
    "method": "Scan de vaisseaux et sources d'émissions chiffrées"
   },
   {
    "key": "ancientbiologicaldata",
    "label": "Pattern Alpha Obelisk Data",
    "english": "Pattern Alpha Obelisk Data",
    "absent": true,
    "type": "Encoded",
    "typeLabel": "Données",
    "category": "None",
    "grade": 4,
    "count": 0,
    "max": 150,
    "method": "Scan de vaisseaux et sources d'émissions chiffrées"
   },
   {
    "key": "ancientculturaldata",
    "label": "Pattern Beta Obelisk Data",
    "english": "Pattern Beta Obelisk Data",
    "absent": true,
    "type": "Encoded",
    "typeLabel": "Données",
    "category": "None",
    "grade": 4,
    "count": 0,
    "max": 150,
    "method": "Scan de vaisseaux et sources d'émissions chiffrées"
   },
   {
    "key": "ancienthistoricaldata",
    "label": "Pattern Gamma Obelisk Data",
    "english": "Pattern Gamma Obelisk Data",
    "absent": true,
    "type": "Encoded",
    "typeLabel": "Données",
    "category": "None",
    "grade": 4,
    "count": 0,
    "max": 150,
    "method": "Scan de vaisseaux et sources d'émissions chiffrées"
   },
   {
    "key": "ancienttechnologicaldata",
    "label": "Pattern Epsilon Obelisk Data",
    "english": "Pattern Epsilon Obelisk Data",
    "absent": true,
    "type": "Encoded",
    "typeLabel": "Données",
    "category": "None",
    "grade": 4,
    "count": 0,
    "max": 150,
    "method": "Scan de vaisseaux et sources d'émissions chiffrées"
   },
   {
    "key": "tg_compositiondata",
    "label": "Thargoid Material Composition Data",
    "english": "Thargoid Material Composition Data",
    "absent": true,
    "type": "Encoded",
    "typeLabel": "Données",
    "category": "None",
    "grade": 3,
    "count": 0,
    "max": 200,
    "method": "Débris et sites thargoïdes, zones de conflit AX"
   },
   {
    "key": "tg_residuedata",
    "label": "Thargoid Residue Data",
    "english": "Thargoid Residue Data",
    "absent": true,
    "type": "Encoded",
    "typeLabel": "Données",
    "category": "None",
    "grade": 4,
    "count": 0,
    "max": 150,
    "method": "Débris et sites thargoïdes, zones de conflit AX"
   },
   {
    "key": "tg_structuraldata",
    "label": "Thargoid Structural Data",
    "english": "Thargoid Structural Data",
    "absent": true,
    "type": "Encoded",
    "typeLabel": "Données",
    "category": "None",
    "grade": 2,
    "count": 0,
    "max": 250,
    "method": "Débris et sites thargoïdes, zones de conflit AX"
   }
  ]
 },
 "/modules/expansion/here": null,
 "/modules/groundcombat/session": {
  "startedAt": "2026-11-16T18:24:34Z",
  "aPied": true,
  "kills": 22,
  "bonds": 1870000,
  "primes": {
   "n": 0,
   "total": 0
  },
  "gains": 1870000,
  "merites": 4400,
  "morts": 0,
  "crimes": 0,
  "largages": 1,
  "killsHeure": 31,
  "parVictime": [],
  "parPayeur": [],
  "consommables": [],
  "recent": [],
  "systeme": "Système Test",
  "guerres": [],
  "installation": null,
  "equipement": {
   "combinaison": "Combinaison Dominator",
   "config": "Config. 1",
   "armes": [
    "TK Aphelion",
    "Karma P-15"
   ]
  },
  "pausedMs": 0,
  "pausedSince": "2026-11-16T18:24:52.000Z",
  "pauseReason": "docked",
  "chronoFrom": null,
  "chronoPausedMs": 0
 },
 "/modules/materials/session": {
  "startedAt": "2026-11-16T18:24:34Z",
  "total": 46,
  "byCategory": {
   "Raw": 21,
   "Manufactured": 17,
   "Encoded": 8
  },
  "byGrade": [
   9,
   14,
   12,
   8,
   3
  ],
  "materials": [],
  "recent": [],
  "pausedMs": 0,
  "pausedSince": "2026-11-16T18:24:52.000Z",
  "pauseReason": "docked",
  "chronoFrom": null,
  "chronoPausedMs": 0
 },
 "/modules/rares/session": {
  "startedAt": "2026-11-16T18:24:34Z",
  "bought": 204,
  "sold": 102,
  "cost": 2063664,
  "revenue": 2505426,
  "profit": 1473594,
  "merits": 1540,
  "deaths": 0,
  "hold": { "count": 102, "items": [{ "label": "Cigares de Kamitra", "count": 102 }] },
  "types": [{ "label": "Cigares de Kamitra", "bought": 204, "sold": 102, "profit": 1473594, "merits": 1540 }],
  "recent": [
   { "at": "2026-11-16T18:41:10Z", "kind": "Acheté", "label": "Cigares de Kamitra", "count": 102, "credits": -1031832, "merits": 0 },
   { "at": "2026-11-16T18:36:02Z", "kind": "Vendu", "label": "Cigares de Kamitra", "count": 102, "credits": 1473594, "merits": 1540 }
  ],
  "pausedMs": 0,
  "pausedSince": "2026-11-16T18:41:30.000Z",
  "pauseReason": "docked",
  "chronoFrom": null,
  "chronoPausedMs": 0
 },
 "/modules/gardiens/site": {
  "site": { "nom": "Structure des Gardiens", "forme": "ancient_small_002", "corps": "Système Test 2 a", "latitude": 19.8236, "longitude": -82.4609, "plan": null, "at": "2026-11-16T18:30:00Z" },
  "guide": null,
  "points": [
   { "id": 1, "type": "pylone", "n": 1, "latitude": 19.8241, "longitude": -82.4602 },
   { "id": 2, "type": "pylone", "n": 2, "latitude": 19.8229, "longitude": -82.4621 },
   { "id": 3, "type": "machine", "n": null, "latitude": 19.8247, "longitude": -82.4611 }
  ],
  "position": { "latitude": 19.8234, "longitude": -82.4609, "heading": 40, "planetRadius": 1500000, "body": "Système Test 2 a" },
  "types": { "pylone": "Pylône", "machine": "Machine", "relique": "Relique" }
 },
 "/modules/gardiens/session": {
  "startedAt": "2026-11-16T18:24:34Z",
  "total": 47,
  "plans": 2,
  "donnees": 9,
  "collectes": [
   { "cle": "guardian_powercell", "count": 21 },
   { "cle": "guardian_techcomponent", "count": 15 },
   { "cle": "ancienttechnologicaldata", "count": 9 },
   { "cle": "guardian_moduleblueprint", "count": 2 }
  ],
  "recent": [
   { "at": "2026-11-16T18:41:10Z", "cle": "guardian_moduleblueprint", "count": 1 }
  ],
  "pausedMs": 0,
  "pausedSince": null,
  "pauseReason": null,
  "chronoFrom": null,
  "chronoPausedMs": 0
 },
 "/modules/powerdelivery/session": {
  "startedAt": "2026-11-16T18:24:34Z",
  "collected": 268,
  "delivered": 268,
  "merits": 1608,
  "deaths": 0,
  "hold": {
   "count": 120,
   "items": [
    {
     "label": "Dossiers de presse",
     "count": 120
    }
   ]
  },
  "types": [
   {
    "label": "Dossiers de presse",
    "collected": 388,
    "delivered": 268,
    "merits": 1608
   }
  ],
  "lastActionAt": "2026-11-16T18:41:10Z",
  "recent": [
   {
    "at": "2026-11-16T18:41:10Z",
    "kind": "Chargé",
    "label": "Dossiers de presse",
    "count": 120,
    "merits": 0
   },
   {
    "at": "2026-11-16T18:36:02Z",
    "kind": "Livré",
    "label": "Dossiers de presse",
    "count": 268,
    "merits": 1608
   }
  ],
  "pausedMs": 0,
  "pausedSince": "2026-11-16T18:41:30.000Z",
  "pauseReason": "docked",
  "chronoFrom": null,
  "chronoPausedMs": 0
 },
 "/modules/rescue/session": {
  "startedAt": "2026-11-16T18:24:34Z",
  "collected": 17,
  "types": [
   {
    "key": "pods",
    "label": "Nacelles",
    "collected": 0,
    "hold": 0
   },
   {
    "key": "blackBoxes",
    "label": "Boîtes noires",
    "collected": 0,
    "hold": 0
   },
   {
    "key": "wreckage",
    "label": "Débris d'épave",
    "collected": 0,
    "hold": 0
   }
  ],
  "delivered": 12,
  "lost": 0,
  "credits": 1150000,
  "merits": 2040,
  "deaths": 0,
  "hold": {
   "count": 5,
   "items": []
  },
  "lastActionAt": null,
  "recent": [],
  "materials": {
   "total": 0,
   "byGrade": [
    0,
    0,
    0,
    0,
    0
   ],
   "items": []
  },
  "pausedMs": 0,
  "pausedSince": "2026-11-16T18:24:52.000Z",
  "pauseReason": "docked",
  "chronoFrom": null,
  "chronoPausedMs": 0
 },
 "/modules/shipmining/session": {
  "startedAt": "2026-11-16T18:24:34Z",
  "hold": {
   "count": 96,
   "capacity": 256,
   "drones": 18
  },
  "prospected": 23,
  "drones": {
   "prospector": 23,
   "collection": 41
  },
  "refined": [],
  "totalRefined": 96,
  "perHour": 142,
  "pricesDate": "2026-11-04",
  "last": null,
  "prospects": [],
  "pausedMs": 0,
  "pausedSince": null,
  "pauseReason": null,
  "chronoFrom": null,
  "chronoPausedMs": 0
 },
 "/modules/waypoints/sweep/top-ores": {
  "minDemand": 1000,
  "ores": [
   {
    "ore": "Iridium",
    "sell": 1010597,
    "demand": 26489,
    "station": "Station Test",
    "system": "Système Test N",
    "pad": "L",
    "updatedAt": "2026-11-15T08:59:22.000Z"
   },
   {
    "ore": "Rhodplumsite",
    "sell": 852721,
    "demand": 1018,
    "station": "Station Test",
    "system": "Système Test N",
    "pad": "L",
    "updatedAt": "2026-11-15T08:59:22.000Z"
   },
   {
    "ore": "Platine",
    "sell": 302844,
    "demand": 2245,
    "station": "Station Test F",
    "system": "Système Test L",
    "pad": "L",
    "updatedAt": "2026-11-15T06:58:51.000Z"
   },
   {
    "ore": "Hélium",
    "sell": 286210,
    "demand": 19907,
    "station": "Station Test B",
    "system": "Système Test M",
    "pad": "L",
    "updatedAt": "2026-11-15T02:25:11.000Z"
   },
   {
    "ore": "Osmium",
    "sell": 273000,
    "demand": 15962,
    "station": "Station Test C",
    "system": "Système Test G",
    "pad": "L",
    "updatedAt": "2026-11-15T05:55:31.000Z"
   },
   {
    "ore": "Magnésite",
    "sell": 172224,
    "demand": 23588,
    "station": "Station Test",
    "system": "Système Test N",
    "pad": "L",
    "updatedAt": "2026-11-15T08:59:22.000Z"
   },
   {
    "ore": "Palladium",
    "sell": 71482,
    "demand": 26022,
    "station": "Station Test",
    "system": "Système Test N",
    "pad": "L",
    "updatedAt": "2026-11-15T08:59:22.000Z"
   },
   {
    "ore": "Or",
    "sell": 67286,
    "demand": 17729,
    "station": "Station Test J",
    "system": "Système Test F",
    "pad": "L",
    "updatedAt": "2026-11-15T07:44:26.000Z"
   },
   {
    "ore": "Argent",
    "sell": 49426,
    "demand": 17938,
    "station": "Station Test D",
    "system": "Système Test B",
    "pad": "L",
    "updatedAt": "2026-11-15T00:09:25.000Z"
   },
   {
    "ore": "Hématite",
    "sell": 18984,
    "demand": 233342,
    "station": "Station Test G",
    "system": "Système Test I",
    "pad": "M",
    "updatedAt": "2026-11-15T05:59:56.000Z"
   }
  ],
  "at": "2026-11-16T19:20:42.764Z"
 },
 "/modules/waypoints/waypoints": [
  {
   "id": 1002,
   "label": "Diamants basse température",
   "category": "mining",
   "notes": "",
   "siteNumber": 4,
   "drills": 4,
   "unprofitable": false,
   "depletedAt": null,
   "system": "Système Test",
   "systemAddress": "1000000000000",
   "body": "Système Test 12 b",
   "station": null,
   "latitude": 11.169399,
   "longitude": -90.803362,
   "altitude": 1,
   "heading": 305,
   "planetRadius": 509666.46875,
   "vehicle": "srv",
   "createdAt": "2026-11-14T22:19:11.172Z",
   "updatedAt": "2026-11-14T22:19:11.172Z",
   "categoryLabel": "Minage",
   "depletedUntil": null
  },
  {
   "id": 1003,
   "label": "Diamants basse température",
   "category": "mining",
   "notes": "",
   "siteNumber": 4,
   "drills": 1,
   "unprofitable": false,
   "depletedAt": null,
   "system": "Système Test",
   "systemAddress": "1000000000000",
   "body": "Système Test 12 b",
   "station": null,
   "latitude": 11.781913,
   "longitude": -90.480314,
   "altitude": 1,
   "heading": 178,
   "planetRadius": 509666.46875,
   "vehicle": "srv",
   "createdAt": "2026-11-14T21:57:34.931Z",
   "updatedAt": "2026-11-14T21:57:34.931Z",
   "categoryLabel": "Minage",
   "depletedUntil": null
  },
  {
   "id": 1004,
   "label": "⛏ Fin du dernier minage",
   "category": "mining",
   "notes": "",
   "siteNumber": 4,
   "drills": null,
   "unprofitable": false,
   "depletedAt": null,
   "system": "Système Test",
   "systemAddress": "1000000000000",
   "body": "Système Test 12 b",
   "station": null,
   "latitude": 11.626928,
   "longitude": -91.026972,
   "altitude": null,
   "heading": null,
   "planetRadius": 509666.46875,
   "vehicle": "srv",
   "createdAt": "2026-11-13T20:57:58.965Z",
   "updatedAt": "2026-11-14T21:34:19.158Z",
   "categoryLabel": "Minage",
   "depletedUntil": null
  },
  {
   "id": 1005,
   "label": "Diamants basse température",
   "category": "mining",
   "notes": "",
   "siteNumber": 4,
   "drills": 3,
   "unprofitable": false,
   "depletedAt": "2026-11-14T21:40:39.340Z",
   "system": "Système Test",
   "systemAddress": "1000000000000",
   "body": "Système Test 12 b",
   "station": null,
   "latitude": 11.629626,
   "longitude": -91.025137,
   "altitude": 1,
   "heading": 348,
   "planetRadius": 509666.46875,
   "vehicle": "srv",
   "createdAt": "2026-11-13T20:22:41.286Z",
   "updatedAt": "2026-11-14T21:40:39.341Z",
   "categoryLabel": "Minage",
   "depletedUntil": "2027-01-14T21:40:39.340Z"
  },
  {
   "id": 1006,
   "label": "Diamants basse température",
   "category": "mining",
   "notes": "",
   "siteNumber": 2,
   "drills": 1,
   "unprofitable": false,
   "depletedAt": null,
   "system": "Système Test",
   "systemAddress": "1000000000000",
   "body": "Système Test 12 b",
   "station": null,
   "latitude": 8.895479,
   "longitude": -34.449606,
   "altitude": 1,
   "heading": 50,
   "planetRadius": 509666.46875,
   "vehicle": "srv",
   "createdAt": "2026-11-13T18:58:56.778Z",
   "updatedAt": "2026-11-13T18:58:56.778Z",
   "categoryLabel": "Minage",
   "depletedUntil": null
  },
  {
   "id": 1007,
   "label": "Diamants basse température",
   "category": "mining",
   "notes": "",
   "siteNumber": 3,
   "drills": 1,
   "unprofitable": false,
   "depletedAt": null,
   "system": "Système Test",
   "systemAddress": "1000000000000",
   "body": "Système Test 11 c",
   "station": null,
   "latitude": 1.93556,
   "longitude": -8.622679,
   "altitude": 0,
   "heading": 31,
   "planetRadius": 482287.1875,
   "vehicle": "srv",
   "createdAt": "2026-11-13T18:38:27.500Z",
   "updatedAt": "2026-11-13T18:38:27.500Z",
   "categoryLabel": "Minage",
   "depletedUntil": null
  },
  {
   "id": 1008,
   "label": "Diamants basse température",
   "category": "mining",
   "notes": "",
   "siteNumber": 3,
   "drills": 1,
   "unprofitable": false,
   "depletedAt": null,
   "system": "Système Test",
   "systemAddress": "1000000000000",
   "body": "Système Test 11 c",
   "station": null,
   "latitude": 1.802673,
   "longitude": -8.705492,
   "altitude": 0,
   "heading": 245,
   "planetRadius": 482287.1875,
   "vehicle": "srv",
   "createdAt": "2026-11-13T18:36:30.016Z",
   "updatedAt": "2026-11-13T18:36:30.016Z",
   "categoryLabel": "Minage",
   "depletedUntil": null
  },
  {
   "id": 1009,
   "label": "Diamants basse température",
   "category": "mining",
   "notes": "",
   "siteNumber": 3,
   "drills": 1,
   "unprofitable": false,
   "depletedAt": null,
   "system": "Système Test",
   "systemAddress": "1000000000000",
   "body": "Système Test 11 c",
   "station": null,
   "latitude": 1.757661,
   "longitude": -8.456938,
   "altitude": 0,
   "heading": 158,
   "planetRadius": 482287.1875,
   "vehicle": "srv",
   "createdAt": "2026-11-13T18:32:15.700Z",
   "updatedAt": "2026-11-13T18:32:15.700Z",
   "categoryLabel": "Minage",
   "depletedUntil": null
  },
  {
   "id": 1010,
   "label": "⛏ Fin du dernier minage",
   "category": "mining",
   "notes": "",
   "siteNumber": 8,
   "drills": null,
   "unprofitable": false,
   "depletedAt": null,
   "system": "Système Test",
   "systemAddress": "1000000000000",
   "body": "Système Test 11 a",
   "station": null,
   "latitude": 17.916774,
   "longitude": -17.914635,
   "altitude": null,
   "heading": null,
   "planetRadius": 492579.1875,
   "vehicle": "srv",
   "createdAt": "2026-11-13T09:16:30.859Z",
   "updatedAt": "2026-11-13T09:16:30.859Z",
   "categoryLabel": "Minage",
   "depletedUntil": null
  },
  {
   "id": 1011,
   "label": "Diamants basse température",
   "category": "mining",
   "notes": "",
   "siteNumber": 8,
   "drills": 2,
   "unprofitable": false,
   "depletedAt": null,
   "system": "Système Test",
   "systemAddress": "1000000000000",
   "body": "Système Test 11 a",
   "station": null,
   "latitude": 17.95742,
   "longitude": -17.990591,
   "altitude": 0,
   "heading": 120,
   "planetRadius": 492579.1875,
   "vehicle": "srv",
   "createdAt": "2026-11-12T23:24:26.538Z",
   "updatedAt": "2026-11-12T23:24:26.538Z",
   "categoryLabel": "Minage",
   "depletedUntil": null
  },
  {
   "id": 1012,
   "label": "Diamants basse température",
   "category": "mining",
   "notes": "",
   "siteNumber": 8,
   "drills": 1,
   "unprofitable": false,
   "depletedAt": null,
   "system": "Système Test",
   "systemAddress": "1000000000000",
   "body": "Système Test 11 a",
   "station": null,
   "latitude": 17.916258,
   "longitude": -17.914848,
   "altitude": 1,
   "heading": 188,
   "planetRadius": 492579.1875,
   "vehicle": "srv",
   "createdAt": "2026-11-12T23:22:09.702Z",
   "updatedAt": "2026-11-12T23:22:09.702Z",
   "categoryLabel": "Minage",
   "depletedUntil": null
  },
  {
   "id": 1013,
   "label": "Diamants basse température",
   "category": "mining",
   "notes": "",
   "siteNumber": 3,
   "drills": 1,
   "unprofitable": false,
   "depletedAt": null,
   "system": "Système Test",
   "systemAddress": "1000000000000",
   "body": "Système Test 11 a",
   "station": null,
   "latitude": 16.437593,
   "longitude": -22.965347,
   "altitude": 1,
   "heading": 31,
   "planetRadius": 492579.1875,
   "vehicle": "srv",
   "createdAt": "2026-11-12T22:48:19.290Z",
   "updatedAt": "2026-11-12T22:48:19.290Z",
   "categoryLabel": "Minage",
   "depletedUntil": null
  },
  {
   "id": 1014,
   "label": "Diamants basse température",
   "category": "mining",
   "notes": "",
   "siteNumber": 3,
   "drills": 2,
   "unprofitable": false,
   "depletedAt": null,
   "system": "Système Test",
   "systemAddress": "1000000000000",
   "body": "Système Test 11 a",
   "station": null,
   "latitude": 16.23557,
   "longitude": -22.891039,
   "altitude": 0,
   "heading": 345,
   "planetRadius": 492579.1875,
   "vehicle": "srv",
   "createdAt": "2026-11-12T22:40:54.669Z",
   "updatedAt": "2026-11-12T22:40:54.669Z",
   "categoryLabel": "Minage",
   "depletedUntil": null
  },
  {
   "id": 1015,
   "label": "Hélium 3",
   "category": "mining",
   "notes": "",
   "siteNumber": 3,
   "drills": 1,
   "unprofitable": false,
   "depletedAt": null,
   "system": "Système Test",
   "systemAddress": "1000000000000",
   "body": "Système Test 11 a",
   "station": null,
   "latitude": 16.175046,
   "longitude": -22.838713,
   "altitude": 0,
   "heading": 112,
   "planetRadius": 492579.1875,
   "vehicle": "srv",
   "createdAt": "2026-11-12T22:39:06.481Z",
   "updatedAt": "2026-11-12T22:39:06.481Z",
   "categoryLabel": "Minage",
   "depletedUntil": null
  }
 ],
 "/modules/waypoints/guide-target": {
  "id": 1002
 },
 "/modules/waypoints/drills/guide": {
  "target": null,
  "state": "off"
 },
 "/modules/waypoints/here": {
  "system": "Système Test",
  "systemAddress": "1000000000000",
  "station": null,
  "body": "Système Test 12 b",
  "latitude": 11.379399,
  "longitude": -91.143362,
  "altitude": 2,
  "heading": 118,
  "planetRadius": 509666.46875,
  "vehicle": "srv",
  "grounded": true,
  "at": "2026-11-14T20:00:00Z"
 },
 "/modules/waypoints/survey": {
  "system": "Système Test",
  "systemAddress": "1000000000000",
  "planets": [
   {
    "body": "Système Test 4",
    "name": "4",
    "subType": "High metal content world",
    "type": "Haute teneur en métaux",
    "distance": 64.920091,
    "gravity": 0.456514020597532,
    "count": 25,
    "seen": 6,
    "good": 2,
    "best": 3,
    "verdict": "good",
    "depletedUntil": null,
    "out": false,
    "notes": "",
    "sites": [
     {
      "number": 6,
      "bad": false,
      "rating": 3,
      "deposits": [
       {
        "ore": "Platine"
       },
       {
        "ore": "Or"
       },
       {
        "ore": "Uranium"
       }
      ],
      "notes": "",
      "waypoints": [],
      "depletedUntil": null,
      "state": "low"
     },
     {
      "number": 10,
      "bad": false,
      "rating": null,
      "deposits": [],
      "notes": "",
      "waypoints": [
       41,
       42,
       43,
       44
      ],
      "depletedUntil": null,
      "state": "good"
     },
     {
      "number": 12,
      "bad": false,
      "rating": null,
      "deposits": [],
      "notes": "",
      "waypoints": [
       23
      ],
      "depletedUntil": null,
      "state": "low"
     },
     {
      "number": 16,
      "bad": false,
      "rating": null,
      "deposits": [],
      "notes": "",
      "waypoints": [
       19,
       20,
       21
      ],
      "depletedUntil": null,
      "state": "good"
     },
     {
      "number": 22,
      "bad": false,
      "rating": null,
      "deposits": [],
      "notes": "",
      "waypoints": [
       22
      ],
      "depletedUntil": null,
      "state": "low"
     },
     {
      "number": 25,
      "bad": false,
      "rating": null,
      "deposits": [
       {
        "ore": "Or"
       },
       {
        "ore": "Hélium"
       },
       {
        "ore": "Iridium"
       },
       {
        "ore": "Titane"
       }
      ],
      "notes": "",
      "waypoints": [
       18,
       25,
       26
      ],
      "depletedUntil": "2027-01-12T17:50:28.165Z",
      "state": "depleted"
     }
    ],
    "looseWaypoints": [],
    "ores": [
     {
      "ore": "Iridium",
      "good": [
       {
        "number": 10,
        "rating": null
       },
       {
        "number": 16,
        "rating": null
       }
      ],
      "weak": [
       {
        "number": 22,
        "rating": null
       },
       {
        "number": 25,
        "rating": null
       }
      ]
     },
     {
      "ore": "Hélium",
      "good": [
       {
        "number": 10,
        "rating": null
       }
      ],
      "weak": [
       {
        "number": 25,
        "rating": null
       }
      ]
     },
     {
      "ore": "Rhodplumsite",
      "good": [
       {
        "number": 16,
        "rating": null
       }
      ],
      "weak": []
     },
     {
      "ore": "Iridiul + 3 or",
      "good": [],
      "weak": [
       {
        "number": 25,
        "rating": null
       }
      ]
     },
     {
      "ore": "Or",
      "good": [],
      "weak": [
       {
        "number": 6,
        "rating": 3
       },
       {
        "number": 25,
        "rating": null
       }
      ]
     },
     {
      "ore": "Platine",
      "good": [],
      "weak": [
       {
        "number": 12,
        "rating": null
       }
      ]
     },
     {
      "ore": "Platine",
      "good": [],
      "weak": [
       {
        "number": 6,
        "rating": 3
       }
      ]
     },
     {
      "ore": "Titane",
      "good": [],
      "weak": [
       {
        "number": 25,
        "rating": null
       }
      ]
     },
     {
      "ore": "Uranium",
      "good": [],
      "weak": [
       {
        "number": 6,
        "rating": 3
       }
      ]
     }
    ],
    "here": false
   },
   {
    "body": "Système Test 10 a",
    "name": "10 a",
    "subType": "Icy body",
    "type": "Glacée",
    "distance": 1842.750888,
    "gravity": 0.053732028143163,
    "count": 15,
    "seen": 1,
    "good": 1,
    "best": null,
    "verdict": "good",
    "depletedUntil": null,
    "out": false,
    "notes": "",
    "sites": [
     {
      "number": 8,
      "bad": false,
      "rating": null,
      "deposits": [],
      "notes": "",
      "waypoints": [
       45,
       47
      ],
      "depletedUntil": null,
      "state": "good"
     }
    ],
    "looseWaypoints": [],
    "ores": [
     {
      "ore": "Tritium",
      "good": [
       {
        "number": 8,
        "rating": null
       }
      ],
      "weak": []
     }
    ],
    "here": false
   },
   {
    "body": "Système Test 12 b",
    "name": "12 b",
    "subType": "Icy body",
    "type": "Glacée",
    "distance": 2577.57144,
    "gravity": 0.0299091465279902,
    "count": 14,
    "seen": 2,
    "good": 1,
    "best": null,
    "verdict": "good",
    "depletedUntil": null,
    "out": false,
    "notes": "",
    "sites": [
     {
      "number": 2,
      "bad": false,
      "rating": null,
      "deposits": [],
      "notes": "",
      "waypoints": [
       62
      ],
      "depletedUntil": null,
      "state": "low"
     },
     {
      "number": 4,
      "bad": false,
      "rating": null,
      "deposits": [],
      "notes": "",
      "waypoints": [
       63,
       64,
       65,
       66
      ],
      "depletedUntil": null,
      "state": "good"
     }
    ],
    "looseWaypoints": [],
    "ores": [
     {
      "ore": "Diamants basse température",
      "good": [
       {
        "number": 4,
        "rating": null
       }
      ],
      "weak": [
       {
        "number": 2,
        "rating": null
       }
      ]
     }
    ],
    "here": false
   },
   {
    "body": "Système Test 2",
    "name": "2",
    "subType": "High metal content world",
    "type": "Haute teneur en métaux",
    "distance": 37.680681,
    "gravity": 0.592223105944733,
    "count": 20,
    "seen": 1,
    "good": 0,
    "best": null,
    "verdict": "low",
    "depletedUntil": null,
    "out": false,
    "notes": "",
    "sites": [
     {
      "number": 17,
      "bad": false,
      "rating": null,
      "deposits": [],
      "notes": "",
      "waypoints": [
       24
      ],
      "depletedUntil": null,
      "state": "low"
     }
    ],
    "looseWaypoints": [],
    "ores": [
     {
      "ore": "iridium",
      "good": [],
      "weak": [
       {
        "number": 17,
        "rating": null
       }
      ]
     }
    ],
    "here": false
   },
   {
    "body": "Système Test 11 c",
    "name": "11 c",
    "subType": "Icy body",
    "type": "Glacée",
    "distance": 1874.328867,
    "gravity": 0.0282873457734271,
    "count": 6,
    "seen": 1,
    "good": 0,
    "best": null,
    "verdict": "low",
    "depletedUntil": null,
    "out": false,
    "notes": "",
    "sites": [
     {
      "number": 3,
      "bad": false,
      "rating": null,
      "deposits": [],
      "notes": "",
      "waypoints": [
       59,
       60,
       61
      ],
      "depletedUntil": null,
      "state": "low"
     }
    ],
    "looseWaypoints": [],
    "ores": [
     {
      "ore": "Diamants basse température",
      "good": [],
      "weak": [
       {
        "number": 3,
        "rating": null
       }
      ]
     }
    ],
    "here": false
   },
   {
    "body": "Système Test 11 a",
    "name": "11 a",
    "subType": "Icy body",
    "type": "Glacée",
    "distance": 1874.355749,
    "gravity": 0.0288968084021617,
    "count": 10,
    "seen": 2,
    "good": 0,
    "best": null,
    "verdict": "low",
    "depletedUntil": null,
    "out": false,
    "notes": "",
    "sites": [
     {
      "number": 3,
      "bad": false,
      "rating": null,
      "deposits": [],
      "notes": "",
      "waypoints": [
       53,
       54,
       55
      ],
      "depletedUntil": null,
      "state": "low"
     },
     {
      "number": 8,
      "bad": false,
      "rating": null,
      "deposits": [],
      "notes": "",
      "waypoints": [
       56,
       57,
       58
      ],
      "depletedUntil": null,
      "state": "low"
     }
    ],
    "looseWaypoints": [],
    "ores": [
     {
      "ore": "Diamants basse température",
      "good": [],
      "weak": [
       {
        "number": 3,
        "rating": null
       },
       {
        "number": 8,
        "rating": null
       }
      ]
     },
     {
      "ore": "Hélium 3",
      "good": [],
      "weak": [
       {
        "number": 3,
        "rating": null
       }
      ]
     }
    ],
    "here": false
   },
   {
    "body": "Système Test 3",
    "name": "3",
    "subType": "High metal content world",
    "type": "Haute teneur en métaux",
    "distance": 65.524687,
    "gravity": 0.487276231263383,
    "count": 10,
    "seen": 0,
    "good": 0,
    "best": null,
    "verdict": "unknown",
    "depletedUntil": null,
    "out": false,
    "notes": "",
    "sites": [],
    "looseWaypoints": [],
    "ores": [],
    "here": false
   },
   {
    "body": "Système Test 10 b",
    "name": "10 b",
    "subType": "Icy body",
    "type": "Glacée",
    "distance": 1843.631112,
    "gravity": 0.0690245742836749,
    "count": 10,
    "seen": 0,
    "good": 0,
    "best": null,
    "verdict": "unknown",
    "depletedUntil": null,
    "out": false,
    "notes": "",
    "sites": [],
    "looseWaypoints": [],
    "ores": [],
    "here": false
   },
   {
    "body": "Système Test 10 c",
    "name": "10 c",
    "subType": "Icy body",
    "type": "Glacée",
    "distance": 1843.880462,
    "gravity": 0.0803152850005098,
    "count": 17,
    "seen": 0,
    "good": 0,
    "best": null,
    "verdict": "unknown",
    "depletedUntil": null,
    "out": false,
    "notes": "",
    "sites": [],
    "looseWaypoints": [],
    "ores": [],
    "here": false
   },
   {
    "body": "Système Test 11 b",
    "name": "11 b",
    "subType": "Icy body",
    "type": "Glacée",
    "distance": 1874.335156,
    "gravity": 0.0314026715611298,
    "count": 5,
    "seen": 0,
    "good": 0,
    "best": null,
    "verdict": "unknown",
    "depletedUntil": null,
    "out": false,
    "notes": "",
    "sites": [],
    "looseWaypoints": [],
    "ores": [],
    "here": false
   },
   {
    "body": "Système Test 12 d",
    "name": "12 d",
    "subType": "Icy body",
    "type": "Glacée",
    "distance": 2576.060478,
    "gravity": 0.0439979606403589,
    "count": 7,
    "seen": 0,
    "good": 0,
    "best": null,
    "verdict": "unknown",
    "depletedUntil": null,
    "out": false,
    "notes": "",
    "sites": [],
    "looseWaypoints": [],
    "ores": [],
    "here": false
   },
   {
    "body": "Système Test 12 e",
    "name": "12 e",
    "subType": "Icy body",
    "type": "Glacée",
    "distance": 2581.679586,
    "gravity": 0.0382054654838381,
    "count": 25,
    "seen": 0,
    "good": 0,
    "best": null,
    "verdict": "unknown",
    "depletedUntil": null,
    "out": false,
    "notes": "",
    "sites": [],
    "looseWaypoints": [],
    "ores": [],
    "here": false
   },
   {
    "body": "Système Test 1",
    "name": "1",
    "subType": "High metal content body",
    "type": "Haute teneur en métaux",
    "distance": null,
    "gravity": null,
    "count": 16,
    "seen": 0,
    "good": 0,
    "best": null,
    "verdict": "unknown",
    "depletedUntil": null,
    "out": false,
    "notes": "",
    "sites": [],
    "looseWaypoints": [],
    "ores": [],
    "here": false
   }
  ],
  "totals": {
   "planets": 13,
   "good": 3,
   "depleted": 0,
   "low": 3,
   "out": 0,
   "unknown": 7
  },
  "current": {
   "body": null,
   "site": null
  },
  "ores": [
   "Magnésite",
   "Or",
   "Iridium",
   "Platine",
   "Rhodplumsite",
   "Titane",
   "Hématite",
   "Hélium",
   "Tritium",
   "Diamants basse température",
   "Eau",
   "Peroxyde d'hydrogène",
   "Bromellite",
   "Cristaux de méthanol monohydraté"
  ],
  "spansh": {
   "auto": true,
   "available": true,
   "loaded": true,
   "at": "2026-11-16T18:45:02.285Z",
   "error": null
  }
 },
 "/modules/waypoints/sweep": {
  "state": "ready",
  "scan": 1500,
  "marge": 300,
  "startedAt": "2026-11-13T19:46:49.127Z",
  "body": "Système Test 12 b",
  "system": "Système Test",
  "center": {
   "latitude": 11.500591,
   "longitude": -90.685156
  },
  "you": null,
  "onBody": false,
  "radius": 6865.9079515608155,
  "steps": [
   {
    "kind": "ring",
    "radius": 5665.9079515608155,
    "min": 5665.9079515608155,
    "max": 5665.9079515608155,
    "outer": 6865.9079515608155,
    "inner": 4465.9079515608155,
    "sectors": [
     1,
     1,
     1,
     1,
     1,
     1,
     1,
     1,
     1,
     1,
     1,
     1,
     1,
     1
    ],
    "done": false,
    "progress": 0.9444444444444444
   },
   {
    "kind": "ring",
    "radius": 3265.9079515608155,
    "min": 3265.9079515608155,
    "max": 3265.9079515608155,
    "outer": 4465.9079515608155,
    "inner": 2065.9079515608155,
    "sectors": [
     0,
     0,
     0,
     0,
     0,
     0,
     0,
     1,
     1,
     1,
     1,
     1,
     1,
     1
    ],
    "done": false,
    "progress": 0.4166666666666667
   },
   {
    "kind": "ring",
    "radius": 865.9079515608155,
    "min": 865.9079515608155,
    "max": 1200,
    "outer": 2065.9079515608155,
    "inner": 0,
    "sectors": [
     0,
     0,
     0,
     1,
     1,
     1,
     1,
     1,
     1,
     1,
     1,
     1,
     1,
     1
    ],
    "done": false,
    "progress": 0.5277777777777778
   }
  ],
  "current": 0,
  "covered": 0.8640467851290126,
  "route": 67560.91456754369,
  "direction": 1,
  "done": false,
  "marks": [
   {
    "id": 1005,
    "label": "Diamants basse température",
    "category": "mining",
    "x": -6046.636849522731,
    "y": 2294.62070333835,
    "d": 6467.387522191257,
    "ore": "Diamants basse température",
    "drills": 3,
    "depleted": true,
    "unprofitable": false,
    "auto": false
   },
   {
    "id": 1004,
    "label": "⛏ Fin du dernier minage",
    "category": "mining",
    "x": -6079.257539921531,
    "y": 2246.6182409721255,
    "d": 6481.100659406663,
    "ore": null,
    "drills": null,
    "depleted": false,
    "unprofitable": false,
    "auto": true
   },
   {
    "id": 1003,
    "label": "Diamants basse température",
    "category": "mining",
    "x": 3643.630042702543,
    "y": 5004.587123088441,
    "d": 6190.471077443717,
    "ore": "Diamants basse température",
    "drills": 1,
    "depleted": false,
    "unprofitable": false,
    "auto": false
   },
   {
    "id": 1002,
    "label": "Diamants basse température",
    "category": "mining",
    "x": -2101.2439382290286,
    "y": -5892.269548828713,
    "d": 6255.722701974438,
    "ore": "Diamants basse température",
    "drills": 4,
    "depleted": false,
    "unprofitable": false,
    "auto": false
   }
  ],
  "eep": {
   "id": "demo-0000",
   "nom": null,
   "numero": 4
  },
  "eeps": 11
 },
 "/modules/waypoints/drills": {
  "active": false,
  "max": 6,
  "destroyRadius": null,
  "drills": []
 },
 "/modules/waypoints/sweep/markets": {
  "system": "Système Test",
  "ores": {
   "Platine": [
    {
     "station": "Station Test H",
     "type": "Outpost",
     "pad": "M",
     "distance": 1874,
     "updatedAt": "2026-11-15T20:22:33.000Z",
     "mine": true,
     "sell": 61978,
     "demand": 7027
    },
    {
     "station": "Station Test I",
     "type": "AsteroidBase",
     "pad": "L",
     "distance": 1873,
     "updatedAt": "2026-11-15T01:07:01.000Z",
     "mine": false,
     "sell": 56832,
     "demand": 427
    }
   ],
   "Palladium": [
    {
     "station": "Station Test H",
     "type": "Outpost",
     "pad": "M",
     "distance": 1874,
     "updatedAt": "2026-11-15T20:22:33.000Z",
     "mine": true,
     "sell": 47654,
     "demand": 1
    },
    {
     "station": "Station Test I",
     "type": "AsteroidBase",
     "pad": "L",
     "distance": 1873,
     "updatedAt": "2026-11-15T01:07:01.000Z",
     "mine": false,
     "sell": 47463,
     "demand": 1
    }
   ],
   "Or": [
    {
     "station": "Station Test H",
     "type": "Outpost",
     "pad": "M",
     "distance": 1874,
     "updatedAt": "2026-11-15T20:22:33.000Z",
     "mine": true,
     "sell": 44707,
     "demand": 1
    },
    {
     "station": "Station Test I",
     "type": "AsteroidBase",
     "pad": "L",
     "distance": 1873,
     "updatedAt": "2026-11-15T01:07:01.000Z",
     "mine": false,
     "sell": 44202,
     "demand": 1
    }
   ],
   "Argent": [
    {
     "station": "Station Test H",
     "type": "Outpost",
     "pad": "M",
     "distance": 1874,
     "updatedAt": "2026-11-15T20:22:33.000Z",
     "mine": true,
     "sell": 33775,
     "demand": 1
    },
    {
     "station": "Station Test I",
     "type": "AsteroidBase",
     "pad": "L",
     "distance": 1873,
     "updatedAt": "2026-11-15T01:07:01.000Z",
     "mine": false,
     "sell": 33369,
     "demand": 1
    }
   ],
   "Uranium": [
    {
     "station": "Station Test H",
     "type": "Outpost",
     "pad": "M",
     "distance": 1874,
     "updatedAt": "2026-11-15T20:22:33.000Z",
     "mine": true,
     "sell": 8277,
     "demand": 74936
    },
    {
     "station": "Station Test I",
     "type": "AsteroidBase",
     "pad": "L",
     "distance": 1873,
     "updatedAt": "2026-11-15T01:07:01.000Z",
     "mine": false,
     "sell": 8277,
     "demand": 9109
    }
   ],
   "Titane": [
    {
     "station": "Station Test H",
     "type": "Outpost",
     "pad": "M",
     "distance": 1874,
     "updatedAt": "2026-11-15T20:22:33.000Z",
     "mine": true,
     "sell": 5535,
     "demand": 58106
    },
    {
     "station": "Station Test I",
     "type": "AsteroidBase",
     "pad": "L",
     "distance": 1873,
     "updatedAt": "2026-11-15T01:07:01.000Z",
     "mine": false,
     "sell": 5535,
     "demand": 1318
    }
   ],
   "Osmium": [
    {
     "station": "Station Test H",
     "type": "Outpost",
     "pad": "M",
     "distance": 1874,
     "updatedAt": "2026-11-15T20:22:33.000Z",
     "mine": true,
     "sell": 50776,
     "demand": 80950
    },
    {
     "station": "Station Test I",
     "type": "AsteroidBase",
     "pad": "L",
     "distance": 1873,
     "updatedAt": "2026-11-15T01:07:01.000Z",
     "mine": false,
     "sell": 50776,
     "demand": 5410
    }
   ],
   "Rhodplumsite": [
    {
     "station": "Station Test I",
     "type": "AsteroidBase",
     "pad": "L",
     "distance": 1873,
     "updatedAt": "2026-11-15T01:07:01.000Z",
     "mine": false,
     "sell": 181076,
     "demand": 18
    },
    {
     "station": "Station Test H",
     "type": "Outpost",
     "pad": "M",
     "distance": 1874,
     "updatedAt": "2026-11-15T20:22:33.000Z",
     "mine": true,
     "sell": 180826,
     "demand": 130
    }
   ],
   "Hématite": [
    {
     "station": "Station Test H",
     "type": "Outpost",
     "pad": "M",
     "distance": 1874,
     "updatedAt": "2026-11-15T20:22:33.000Z",
     "mine": true,
     "sell": 3717,
     "demand": 1
    },
    {
     "station": "Station Test I",
     "type": "AsteroidBase",
     "pad": "L",
     "distance": 1873,
     "updatedAt": "2026-11-15T01:07:01.000Z",
     "mine": false,
     "sell": 3166,
     "demand": 1
    }
   ],
   "Iridium": [
    {
     "station": "Station Test H",
     "type": "Outpost",
     "pad": "M",
     "distance": 1874,
     "updatedAt": "2026-11-15T20:22:33.000Z",
     "mine": true,
     "sell": 311649,
     "demand": 15556
    },
    {
     "station": "Station Test I",
     "type": "AsteroidBase",
     "pad": "L",
     "distance": 1873,
     "updatedAt": "2026-11-15T01:07:01.000Z",
     "mine": false,
     "sell": 311649,
     "demand": 946
    }
   ],
   "Hélium": [
    {
     "station": "Station Test H",
     "type": "Outpost",
     "pad": "M",
     "distance": 1874,
     "updatedAt": "2026-11-15T20:22:33.000Z",
     "mine": true,
     "sell": 118283,
     "demand": 86
    },
    {
     "station": "Station Test I",
     "type": "AsteroidBase",
     "pad": "L",
     "distance": 1873,
     "updatedAt": "2026-11-15T01:07:01.000Z",
     "mine": false,
     "sell": 62727,
     "demand": 0
    }
   ],
   "Magnésite": [
    {
     "station": "Station Test I",
     "type": "AsteroidBase",
     "pad": "L",
     "distance": 1873,
     "updatedAt": "2026-11-15T01:07:01.000Z",
     "mine": false,
     "sell": 36352,
     "demand": 0
    }
   ]
  },
  "ranking": [
   {
    "ore": "Iridium",
    "sell": 311649,
    "station": "Station Test H",
    "demand": 16502,
    "stations": 2
   },
   {
    "ore": "Rhodplumsite",
    "sell": 181076,
    "station": "Station Test I",
    "demand": 148,
    "stations": 2
   },
   {
    "ore": "Hélium",
    "sell": 118283,
    "station": "Station Test H",
    "demand": 86,
    "stations": 1
   },
   {
    "ore": "Platine",
    "sell": 61978,
    "station": "Station Test H",
    "demand": 7454,
    "stations": 2
   },
   {
    "ore": "Osmium",
    "sell": 50776,
    "station": "Station Test H",
    "demand": 86360,
    "stations": 2
   },
   {
    "ore": "Uranium",
    "sell": 8277,
    "station": "Station Test H",
    "demand": 84045,
    "stations": 2
   },
   {
    "ore": "Titane",
    "sell": 5535,
    "station": "Station Test H",
    "demand": 59424,
    "stations": 2
   }
  ],
  "error": null,
  "ardent": {
   "auto": true,
   "loaded": true,
   "at": "2026-11-16T18:45:02.579Z"
  }
 },
 "/modules/waypoints/session": {
  "id": 1016,
  "runningSince": null,
  "priorSec": 2123,
  "pause": null,
  "waypointId": 1002,
  "label": "Diamants basse température",
  "siteNumber": 4,
  "body": "Système Test 12 b",
  "system": "Système Test",
  "startedAt": "2026-11-15T19:47:57.000Z",
  "durationSec": 2123,
  "refined": 270,
  "transferred": 268,
  "perHour": 458,
  "recentPerHour": 458,
  "sold": 268,
  "unsold": 2,
  "soldOutside": 0,
  "credits": 46119584,
  "creditsPerHour": 78193342,
  "merits": 9017,
  "meritsPerHour": 15288,
  "ores": [
   {
    "key": "lowtemperaturediamond",
    "label": "Diamants basse température",
    "refined": 270,
    "transferred": 268,
    "sold": 268,
    "credits": 46119584
   }
  ],
  "materials": [
   {
    "key": "nickel",
    "label": "Nickel",
    "count": 24,
    "grade": 1
   },
   {
    "key": "cadmium",
    "label": "Cadmium",
    "count": 4,
    "grade": 3
   },
   {
    "key": "sulphur",
    "label": "Soufre",
    "count": 1,
    "grade": 1
   }
  ],
  "cargo": {
   "srv": 46,
   "srvMax": 72,
   "srvName": "VRS Rhino",
   "ship": 120,
   "shipCapacity": 268,
   "shipItems": []
  },
  "prices": {
   "uranium": 6320,
   "powergenerators": 2948,
   "soontillrelics": 18261,
   "bauxite": 13887,
   "indium": 24467,
   "gold": 44162,
   "silver": 4054,
   "gallium": 27165,
   "beryllium": 42854,
   "bertrandite": 2138,
   "copper": 42,
   "tantalum": 15225,
   "iridium": 194385,
   "platinum": 61862,
   "rhodplumsite": 793457,
   "palladium": 53814,
   "fujintea": 16775,
   "titanium": 5479,
   "haematite": 1253,
   "helium": 66482,
   "lowtemperaturediamond": 172088,
   "methanolmonohydratecrystals": 2598,
   "lithiumhydroxide": 5805
  }
 },
 "/modules/waypoints/waypoints/1002/guide": {
  "state": "guiding",
  "distance": 1840,
  "bearing": 96,
  "heading": 118,
  "turn": -22,
  "arrived": false
 },
 "/modules/navroute/session": {
  "jumpsLeft": 7,
  "total": 12,
  "destination": "Système Test D",
  "distance": 214.6,
  "next": {
   "starClass": "K",
   "scoopable": true
  },
  "unscoopable": 1,
  "nextUnscoopable": {
   "in": 3,
   "name": "Système Test B",
   "starClass": "T"
  },
  "fuel": null
 },
 "/modules/signals/session": {
  "system": {
   "name": "Système Test",
   "address": 1000000000000,
   "at": "2026-11-14T19:56:00Z"
  },
  "away": false,
  "count": 6,
  "groups": [
   {
    "group": "uss",
    "title": "Sources de signal",
    "items": [
     {
      "label": "Émissions dégradées",
      "count": 2,
      "threat": 0
     },
     {
      "label": "Émissions de combat",
      "count": 1,
      "threat": 3
     }
    ]
   },
   {
    "group": "res",
    "title": "Sites d’extraction",
    "items": [
     {
      "label": "Site d’extraction [élevé]",
      "count": 1,
      "threat": null
     }
    ]
   },
   {
    "group": "megaship",
    "title": "Mégavaisseaux",
    "items": [
     {
      "label": "Vaisseau de transport",
      "count": 1,
      "threat": null
     }
    ]
   },
   {
    "group": "installation",
    "title": "Installations",
    "items": [
     {
      "label": "Avant-poste de recherche",
      "count": 1,
      "threat": null
     }
    ]
   }
  ]
 },
 "/modules/systeme/mesure": {
  "at": "2026-11-14T20:00:00Z",
  "gpu": {
   "nom": "Carte graphique",
   "chargePct": 78,
   "tempC": 67,
   "watts": 285
  },
  "vram": {
   "utiliseeMo": 9800,
   "totaleMo": 16384,
   "libreMo": 6584,
   "iaMo": 0,
   "autresMo": 9800,
   "picMo": 10600
  },
  "cpuPct": 34,
  "ram": {
   "utiliseeMo": 18200,
   "totaleMo": 32768
  },
  "eliteMo": 7400,
  "ia": null
 },
 "/modules/systeme/reglages": {
  "fenetre": true
 }
};
