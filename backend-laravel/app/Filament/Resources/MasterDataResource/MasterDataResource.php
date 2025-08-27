<?php

namespace App\Filament\Resources\MasterDataResource;

use App\Filament\Resources\MasterDataResource\Pages;
use App\Filament\Resources\MasterDataResource\RelationManagers;
use App\Models\MasterData;
use Filament\Forms;
use Filament\Resources\Resource;
use Filament\Actions\BulkActionGroup;
use Filament\Actions\DeleteAction;
use Filament\Actions\DeleteBulkAction;
use Filament\Actions\EditAction;
use Filament\Tables;
use Filament\Tables\Table;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\SoftDeletingScope;
use Filament\Forms\Components\TextInput;
use Filament\Forms\Components\Toggle;
use Filament\Forms\Components\KeyValue;
use Filament\Tables\Columns\TextColumn;
use Filament\Tables\Columns\IconColumn;
use BackedEnum;
use Filament\Schemas\Schema;

class MasterDataResource extends Resource
{
    protected static ?string $model = MasterData::class;

    protected static string | BackedEnum | null $navigationIcon = 'heroicon-o-cube';

    public static function form(Schema $form): Schema // Changed from Form to Schema
    {
        return $form
            ->schema([
                TextInput::make('type')
                    ->required()
                    ->maxLength(255),
                TextInput::make('version')
                    ->numeric()
                    ->required(),
                TextInput::make('description')
                    ->nullable()
                    ->maxLength(255),
                KeyValue::make('data')
                    ->required(),
                Toggle::make('is_active')
                    ->default(true),
            ]);
    }

    public static function table(Table $table): Table
    {
        return $table
            ->columns([
                TextColumn::make('type')
                    ->searchable()
                    ->sortable(),
                TextColumn::make('version')
                    ->numeric()
                    ->searchable()
                    ->sortable(),
                TextColumn::make('description')
                    ->searchable()
                    ->sortable(),
                IconColumn::make('is_active')
                    ->boolean()
                    ->sortable(),
                TextColumn::make('created_at')
                    ->dateTime()
                    ->sortable()
                    ->toggleable(isToggledHiddenByDefault: true),
                TextColumn::make('updated_at')
                    ->dateTime()
                    ->sortable()
                    ->toggleable(isToggledHiddenByDefault: true),
            ])
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
            'index' => Pages\ListMasterData::route('/'),
            'create' => Pages\CreateMasterData::route('/create'),
            'edit' => Pages\EditMasterData::route('/{record}/edit'),
        ];
    }

    public static function getEloquentQuery(): Builder
    {
        return parent::getEloquentQuery()
            ->withoutGlobalScopes([
                SoftDeletingScope::class,
            ]);
    }
}
