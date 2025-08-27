<?php

namespace App\Filament\Resources\SatkerWilayahTugasResource;

use App\Filament\Resources\SatkerWilayahTugasResource\Pages;
use App\Filament\Resources\SatkerWilayahTugasResource\RelationManagers;
use App\Models\SatkerWilayahTugas;
use Filament\Forms;
use Filament\Resources\Resource;
use Filament\Tables;
use Filament\Tables\Table;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\SoftDeletingScope;
use BackedEnum;
use Filament\Actions\BulkActionGroup;
use Filament\Actions\DeleteAction;
use Filament\Actions\DeleteBulkAction;
use Filament\Actions\EditAction;
use Filament\Schemas\Schema;

class SatkerWilayahTugasResource extends Resource
{
    protected static ?string $model = SatkerWilayahTugas::class;

    protected static string | BackedEnum | null $navigationIcon = 'heroicon-o-map-pin';

    public static function form(Schema $form): Schema
    {
        return $form->schema(self::getFormSchema());
    }

    public static function table(Table $table): Table
    {
        return $table
            ->columns(self::getTableColumns())
            ->filters([
                //
            ])
            ->actions([
                EditAction::make(),
                DeleteAction::make(),
            ])
            ->bulkActions([
                BulkActionGroup::make([
                    DeleteBulkAction::make(),
                ]),
            ]);
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
            'index' => Pages\ListSatkerWilayahTugas::route('/'),
            'create' => Pages\CreateSatkerWilayahTugas::route('/create'),
            'edit' => Pages\EditSatkerWilayahTugas::route('/{record}/edit'),
        ];
    }

    public static function getEloquentQuery(): Builder
    {
        return parent::getEloquentQuery()
            ->withoutGlobalScopes([
                SoftDeletingScope::class,
            ]);
    }

    public static function getFormSchema(): array
    {
        return [
            Forms\Components\Select::make('satker_id')
                ->relationship('satker', 'name')
                ->required()
                ->preload()
                ->searchable(),
            Forms\Components\TextInput::make('wilayah_level')
                ->numeric()
                ->required(),
            Forms\Components\TextInput::make('wilayah_code_prefix')
                ->required()
                ->maxLength(255),
        ];
    }

    public static function getTableColumns(): array
    {
        return [
            Tables\Columns\TextColumn::make('satker.name')
                ->label('Satker')
                ->searchable()
                ->sortable(),
            Tables\Columns\TextColumn::make('wilayah_level')
                ->numeric()
                ->searchable()
                ->sortable(),
            Tables\Columns\TextColumn::make('wilayah_code_prefix')
                ->searchable()
                ->sortable(),
            Tables\Columns\TextColumn::make('created_at')
                ->dateTime()
                ->sortable()
                ->toggleable(isToggledHiddenByDefault: true),
            Tables\Columns\TextColumn::make('updated_at')
                ->dateTime()
                ->sortable()
                ->toggleable(isToggledHiddenByDefault: true),
        ];
    }
}
