#!/usr/bin/env python3
"""Bake the tavern furniture into src/js/53-tavern-assets.js.

assimp drops image references when it converts FBX, so the pairing of a
model to its albedo is written out here rather than discovered. Several
models share one atlas (both bottles, both plates) and the book keys on
the image's own filename, so a shared atlas is inlined exactly once.
"""
import sys, os
import numpy as np
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import bake

T = '/mnt/user-data/uploads/monarchy stuff/Assets/soiTavern_fbx/'

M = {
 'Fireplace':   ('Fireplace/trn_Fireplace.fbx',      'Fireplace/trn_Fireplace_AlbedoTransparency.png'),
 'Chair':       ('Chairs/trn_ChairSimple.fbx',       'Chairs/trn_ChairSimple_AlbedoTransparency.png'),
 'Bench':       ('Chairs/trn_Bench.fbx',             'Chairs/trn_Bench_AlbedoTransparency.png'),
 'BarStool':    ('Chairs/trn_BarStool.fbx',          'Chairs/trn_BarStool_AlbedoTransparency.png'),
 'Stool':       ('Chairs/trn_SmallStool.fbx',        'Chairs/trn_SmallStool_AlbedoTransparency.png'),
 'TableLong':   ('Tables/trn_TableLong.fbx',         'Tables/trn_TableLong_AlbedoTransparency.png'),
 'TableRound':  ('Tables/trn_TableRound.fbx',        'Tables/trn_TableRound_AlbedoTransparency.png'),
 'Chandelier':  ('Chandelier/trn_Chandelier.fbx',    'Chandelier/trn_Chandelier_AlbedoTransparency.png'),
 'Candle':      ('Candles/trn_Candle.fbx',           'Candles/trn_Candle_AlbedoTransparency.png'),
 'CandleFlame': ('Candles/trn_CandleFlame.fbx',      'Candles/trn_CandleFlame.png'),
 'CandleStand': ('CandleStand/trn_CandleStand.fbx',  'CandleStand/trn_CandleStand_AlbedoTransparency.png'),
 'Candelabra':  ('Candelabra/trn_Candelabra.fbx',    'Candelabra/trn_Candelabra_AlbedoTransparency.png'),
 'Barrel':      ('Barrel/trn_Barrel.fbx',            'Barrel/trn_Barrel_AlbedoTransparency.png'),
 'BarrelStand': ('Barrel/trn_BarrelStand.fbx',       'Barrel/trn_BarrelStand_AlbedoTransparency.png'),
 'BottleLong':  ('Vessels/trn_BottleLong.fbx',       'Vessels/trn_Bottles_AlbedoTransparency.png'),
 'BottleShort': ('Vessels/trn_BottleShort.fbx',      'Vessels/trn_Bottles_AlbedoTransparency.png'),
 'Jug':         ('Vessels/trn_Jug.fbx',              'Vessels/trn_Jug_AlbedoTransparency.png'),
 'CupMetal':    ('Cups/trn_CupMetal.fbx',            'Cups/trn_CupMetal_AlbedoTransparency.png'),
 'CupCeramic':  ('Cups/trn_CupCeramic.fbx',          'Cups/trn_CupCeramic_AlbedoTransparency.png'),
 'Plate':       ('Plates/trn_Plate.fbx',             'Plates/trn_Plates_AlbedoTransparency.png'),
 'Bowl':        ('Plates/trn_Bowl.fbx',              'Plates/trn_Plates_AlbedoTransparency.png'),
 'Rack':        ('Shelves/trn_Rack.fbx',             'Shelves/trn_Rack_AlbedoTransparency.png'),
 'Pantry':      ('Shelves/trn_Pantry.fbx',           'Shelves/trn_pantry_AlbedoTransparency.png'),
 'FlourSack':   ('Sacks/trn_FlourSack.fbx',          'Sacks/trn_SacksFlour_AlbedoTransparency.png'),
 'Rug':         ('Rugs/trn_AnimalRug.fbx',           'Rugs/trn_AnimalRug_Bear_AlbedoTransparency.png'),
 'FireLog':     ('FireLog/trn_Log.fbx',              'FireLog/trn_Log_AlbedoTransparency.png'),
 'Cauldron':    ('Cauldron/trn_Cauldron.fbx',        'Cauldron/trn_Cauldron_AlbedoTransparency.png'),
 'Lamp':        ('Lamp/trn_Lamp.fbx',                'Lamp/trn_Lamp_AlbedoTransparency.png'),
 'Cheese':      ('Cheese/trn_Cheese.fbx',            'Cheese/trn_Cheese_AlbedoTransparency.png'),
 'Apple':       ('Apple/trn_Apple.fbx',              'Apple/trn_Apple_Red_AlbedoTransparency.png'),
}

models, book = {}, {}
for name, (fbx, png) in M.items():
    key = os.path.splitext(os.path.basename(png))[0]
    ps, _ = bake.prims_of(T + fbx, texkey=key, scale=0.01)   # cm -> m
    if not ps:
        print('  !! no geometry:', name)
        continue
    models[name] = ps
    if key not in book:
        book[key] = bake.texture(T + png, px=1024, quality=84)
    a = np.array([v for p in ps for v in p['p']]).reshape(-1, 3)
    print('  %-13s prims %2d verts %6d  size %s'
          % (name, len(ps), len(a), np.round(a.max(0) - a.min(0), 2).tolist()))

print('\n%d textures, %.1f MB of data URI'
      % (len(book), sum(len(v) for v in book.values()) / 1024 / 1024))
sz = bake.emit(os.path.join(os.path.dirname(__file__), '..', 'src', 'js',
                            '53-tavern-assets.js'),
               'TAVERN', models, book,
               'Tavern furniture, from the soiTavern pack (FBX via assimp).')
print('src/js/53-tavern-assets.js  %.2f MB' % (sz / 1024 / 1024))
