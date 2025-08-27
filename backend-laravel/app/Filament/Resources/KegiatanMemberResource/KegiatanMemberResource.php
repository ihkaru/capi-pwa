<?php

namespace App\Filament\Resources\KegiatanMemberResource;

use App\Filament\Resources\KegiatanMemberResource\Pages;
use App\Filament\Resources\KegiatanMemberResource\RelationManagers;
use App\Models\KegiatanMember;
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

class KegiatanMemberResource extends Resource
{
    protected static ?string $model = KegiatanMember::class;

    protected static string | BackedEnum | null $navigationIcon = 'heroicon-o-user-group';

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
            'index' => Pages\ListKegiatanMembers::route('/'),
            'create' => Pages\CreateKegiatanMember::route('/create'),
            'edit' => Pages\EditKegiatanMember::route('/{record}/edit'),
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
            Forms\Components\Select::make('kegiatan_statistik_id')
                ->relationship('kegiatanStatistik', 'name')
                ->required()
                ->preload()
                ->searchable(),
            Forms\Components\Select::make('user_id')
                ->relationship('user', 'name')
                ->required()
                ->preload()
                ->searchable(),
        ];
    }

    public static function getTableColumns(): array
    {
        return [
            Tables\Columns\TextColumn::make('kegiatanStatistik.name')
                ->label('Kegiatan Statistik')
                ->searchable()
                ->sortable(),
            Tables\Columns\TextColumn::make('user.name')
                ->label('User')
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
