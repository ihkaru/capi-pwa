<?php

namespace App\Filament\Resources\MasterSlsResource;

use App\Filament\Resources\MasterSlsResource\Pages;
use App\Filament\Resources\MasterSlsResource\RelationManagers;
use App\Models\MasterSls;
use Filament\Forms; // Changed from Form to Schema
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

class MasterSlsResource extends Resource
{
    protected static ?string $model = MasterSls::class;

    protected static string | BackedEnum | null $navigationIcon = 'heroicon-o-map';

    public static function form(Schema $form): Schema // Changed from Form to Schema
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
            'index' => Pages\ListMasterSls::route('/'),
            'create' => Pages\CreateMasterSls::route('/create'),
            'edit' => Pages\EditMasterSls::route('/{record}/edit'),
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
            Forms\Components\TextInput::make('prov_id')
                ->required()
                ->maxLength(255),
            Forms\Components\TextInput::make('kabkot_id')
                ->required()
                ->maxLength(255),
            Forms\Components\TextInput::make('kec_id')
                ->required()
                ->maxLength(255),
            Forms\Components\TextInput::make('desa_kel_id')
                ->required()
                ->maxLength(255),
            Forms\Components\TextInput::make('sls_id')
                ->required()
                ->maxLength(255),
            Forms\Components\TextInput::make('provinsi')
                ->required()
                ->maxLength(255),
            Forms\Components\TextInput::make('kabkot')
                ->required()
                ->maxLength(255),
            Forms\Components\TextInput::make('kecamatan')
                ->required()
                ->maxLength(255),
            Forms\Components\TextInput::make('desa_kel')
                ->required()
                ->maxLength(255),
            Forms\Components\TextInput::make('nama')
                ->required()
                ->maxLength(255),
        ];
    }

    public static function getTableColumns(): array
    {
        return [
            Tables\Columns\TextColumn::make('prov_id')
                ->searchable()
                ->sortable(),
            Tables\Columns\TextColumn::make('kabkot_id')
                ->searchable()
                ->sortable(),
            Tables\Columns\TextColumn::make('kec_id')
                ->searchable()
                ->sortable(),
            Tables\Columns\TextColumn::make('desa_kel_id')
                ->searchable()
                ->sortable(),
            Tables\Columns\TextColumn::make('sls_id')
                ->searchable()
                ->sortable(),
            Tables\Columns\TextColumn::make('provinsi')
                ->searchable()
                ->sortable(),
            Tables\Columns\TextColumn::make('kabkot')
                ->searchable()
                ->sortable(),
            Tables\Columns\TextColumn::make('kecamatan')
                ->searchable()
                ->sortable(),
            Tables\Columns\TextColumn::make('desa_kel')
                ->searchable()
                ->sortable(),
            Tables\Columns\TextColumn::make('nama')
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
