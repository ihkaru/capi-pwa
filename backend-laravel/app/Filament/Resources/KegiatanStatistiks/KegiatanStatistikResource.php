<?php

namespace App\Filament\Resources\KegiatanStatistiks;

use App\Filament\Resources\KegiatanStatistiks\Pages\CreateKegiatanStatistik;
use App\Filament\Resources\KegiatanStatistiks\Pages\EditKegiatanStatistik;
use App\Filament\Resources\KegiatanStatistiks\Pages\ListKegiatanStatistiks;
use App\Filament\Resources\KegiatanStatistiks\Schemas\KegiatanStatistikForm;
use App\Filament\Resources\KegiatanStatistiks\Tables\KegiatanStatistiksTable;
use App\Models\KegiatanStatistik;
use BackedEnum;
use Filament\Resources\Resource;
use Filament\Schemas\Schema;
use Filament\Support\Icons\Heroicon;
use Filament\Tables\Table;

class KegiatanStatistikResource extends Resource
{
    protected static ?string $model = KegiatanStatistik::class;

    protected static string|BackedEnum|null $navigationIcon = Heroicon::OutlinedRectangleStack;

    protected static ?string $recordTitleAttribute = 'name';

    public static function form(Schema $form): Schema
    {
        return KegiatanStatistikForm::configure($form);
    }

    public static function table(Table $table): Table
    {
        return KegiatanStatistiksTable::configure($table);
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
            'index' => ListKegiatanStatistiks::route('/'),
            'create' => CreateKegiatanStatistik::route('/create'),
            'edit' => EditKegiatanStatistik::route('/{record}/edit'),
        ];
    }
}
