<?php

namespace App\Filament\Resources\KegiatanSatkers;

use App\Filament\Resources\KegiatanSatkers\Pages\CreateKegiatanSatker;
use App\Filament\Resources\KegiatanSatkers\Pages\EditKegiatanSatker;
use App\Filament\Resources\KegiatanSatkers\Pages\ListKegiatanSatkers;
use App\Filament\Resources\KegiatanSatkers\Tables\KegiatanSatkersTable;
use App\Models\KegiatanSatker;
use BackedEnum;
use Filament\Forms\Components\Select;
use Filament\Resources\Resource;
use Filament\Forms\Form;
use Filament\Schemas\Schema;
use Filament\Support\Icons\Heroicon;
use Filament\Tables\Table;

class KegiatanSatkerResource extends Resource
{
    protected static ?string $model = KegiatanSatker::class;

    protected static string|BackedEnum|null $navigationIcon = Heroicon::OutlinedRectangleStack;

    protected static ?string $recordTitleAttribute = 'kegiatan_statistik_id';

    public static function form(Schema $form): Schema
    {
        return $form
            ->schema([
                Select::make('kegiatan_statistik_id')
                    ->relationship('kegiatanStatistik', 'name')
                    ->required()
                    ->preload(),
                Select::make('satker_id')
                    ->relationship('satker', 'name')
                    ->required()
                    ->preload(),
            ]);
    }

    public static function table(Table $table): Table
    {
        return KegiatanSatkersTable::configure($table);
    }

    public static function getRelations(): array
    {
        return [
            //
        ];
    }

    public static function getPages(): array
    {
        return [
            'index' => ListKegiatanSatkers::route('/'),
            'create' => CreateKegiatanSatker::route('/create'),
            'edit' => EditKegiatanSatker::route('/{record}/edit'),
        ];
    }
}
