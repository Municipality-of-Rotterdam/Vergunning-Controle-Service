## 1. Overview
Cartesische coördinaten in IFC (Industry Foundation Classes) verwijzen naar de X, Y en Z-coördinaten die worden gebruikt om de positie van objecten in een driedimensionale ruimte te bepalen. In de context van IFC worden Cartesische coördinaten gebruikt om de geometrische representatie van bouwelementen en andere objecten vast te leggen.

IFC is een open bestandsformaat dat wordt gebruikt in de bouw- en bouwgerelateerde industrieën om informatie over bouwelementen, zoals muren, vloeren, ramen, deuren, enzovoort, te beschrijven en uit te wisselen. Elke objectinstantie in een IFC-bestand kan Cartesische coördinaten hebben om zijn positie en oriëntatie in de ruimte te specificeren.

In IFC worden de X-, Y- en Z-coördinaten meestal uitgedrukt in een bepaalde eenheid, zoals meters, millimeters, voeten, enzovoort, afhankelijk van de toepassing en de vereisten van het project. Deze coördinaten worden gebruikt om de geometrische vorm van objecten te bepalen, waardoor het mogelijk is om de ruimtelijke relaties tussen verschillende bouwelementen vast te leggen.

Bij het werken met IFC-bestanden in Python, kunt u code schrijven om deze Cartesische coördinaten van objecten te extraheren en vervolgens te gebruiken voor verschillende doeleinden, zoals visualisatie, analyse, georeferentie en meer, afhankelijk van uw specifieke behoeften en toepassingsscenario's.

Georeferentie van Cartesische coördinaten verwijst naar het proces van het toewijzen van deze coördinaten aan een specifiek geografisch referentiesysteem, zoals een coördinatensysteem op aarde. Hiermee kunnen de Cartesische coördinaten worden gebruikt in GIS (Geografisch Informatiesysteem) toepassingen, kaarten en andere georuimtelijke analyses.

Het proces van georeferentie omvat meestal het bepalen van een aantal parameters om de conversie tussen Cartesische coördinaten en geografische coördinaten uit te voeren.

Er is een code beschikbaar die alle Cartesische punten uit een IFC-bestand kan extraheren en ze vervolgens kan omzetten naar een CSV-bestand met X-, Y- en Z-coördinaten.

## 2. Stappen om script te uitvoeren

# 2.1. Extract cartesian coordinaten

2.1.1.Installeer de nodige bibliotheken: Gebruik pip om de benodigde bibliotheken te installeren, zoals ifcopenshell en numpy. Gebruik het volgende commando in de terminal:

`pip install ifcopenshell numpy`

2.1.2. Importeer bibliotheken: In je Python-script, importeer de benodigde bibliotheken.

```python
import ifcopenshell
import numpy as np
```
2.1.3.  Open 1_Cartesian2Csv.py bestaand.
Als nodig update de path naar ifc file of hernoemen de `output` bestaand.

2.1.4. Om coordinaten te extracten run het volgende commando in de terminal:

`python3 1_Cartesian2Csv.py -ifc_file "./../../static/Kievitsweg_R23_MVP_IFC4.ifc" -o "./coordinates/coordinates.csv`

# 2.2. Georeferentie van coordinaten

2.2.1.  Open Georef.py bestaand.
Als nodig update de path naar `input` file of hernoemen de `output` bestaand.

2.2.2. Om coordinaten te georefereren run het volgende commando in de terminal:

`python3 2_Georef.py`

# 2.3 Berekening van de footprint 

`python3 footprint_approx.py -ifc_file "./../static/Kievitsweg_R23_MVP_IFC4.ifc" -o "./../data/footprint.txt"`