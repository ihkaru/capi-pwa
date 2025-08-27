<?php

namespace App\Filament\Resources\Satkers;

use App\Filament\Resources\Satkers\Pages\CreateSatker;
use App\Filament\Resources\Satkers\Pages\EditSatker;
use App\Filament\Resources\Satkers\Pages\ListSatkers;
use App\Filament\Resources\Satkers\Schemas\SatkerForm;
use App\Filament\Resources\Satkers\Tables\SatkersTable;
use App\Models\Satker;
use BackedEnum;
use Filament\Resources\Resource;
use Filament\Forms\Form;
use Filament\Schemas\Schema;
use Filament\Support\Icons\Heroicon;
use Filament\Tables\Table;

class SatkerResource extends Resource
{
    protected static ?string $model = Satker::class;

    protected static string|BackedEnum|null $navigationIcon = Heroicon::OutlinedRectangleStack;

    protected static ?string $recordTitleAttribute = 'name';

    public static function form(Schema $form): Schema
    {
        return SatkerForm::configure($form);
    }

    public static function table(Table $table): Table
    {
        return SatkersTable::configure($table);
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
            'index' => ListSatkers::route('/'),
            'create' => CreateSatker::route('/create'),
            'edit' => EditSatker::route('/{record}/edit'),
        ];
    }
}
