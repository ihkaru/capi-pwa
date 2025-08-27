<?php

namespace App\Filament\Resources\ResponseHistoryResource;

use App\Filament\Resources\ResponseHistoryResource\Pages;
use App\Filament\Resources\ResponseHistoryResource\RelationManagers;
use App\Models\ResponseHistory;
use Filament\Forms;
use Filament\Resources\Resource;
use Filament\Actions\BulkActionGroup;
use Filament\Actions\DeleteAction;
use Filament\Actions\DeleteBulkAction; // Fixed typo
use Filament\Actions\EditAction;
use Filament\Tables;
use Filament\Tables\Table;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\SoftDeletingScope;
use Filament\Forms\Components\TextInput;
use Filament\Forms\Components\Select;
use Filament\Forms\Components\Textarea;
use Filament\Tables\Columns\TextColumn;
use BackedEnum;
use Filament\Schemas\Schema;

class ResponseHistoryResource extends Resource
{
    protected static ?string $model = ResponseHistory::class;

    protected static string | BackedEnum | null $navigationIcon = 'heroicon-o-clock';

    public static function form(Schema $form): Schema // Changed from Form to Schema
    {
        return $form
            ->schema([
                Select::make('assignment_response_id')
                    ->relationship('assignmentResponse', 'assignment_id')
                    ->required()
                    ->preload()
                    ->searchable(),
                Select::make('user_id')
                    ->relationship('user', 'name')
                    ->required()
                    ->preload()
                    ->searchable(),
                TextInput::make('from_status')
                    ->nullable()
                    ->maxLength(255),
                TextInput::make('to_status')
                    ->required()
                    ->maxLength(255),
                Textarea::make('notes')
                    ->nullable(),
            ]);
    }

    public static function table(Table $table): Table
    {
        return $table
            ->columns([
                TextColumn::make('assignmentResponse.assignment_id')
                    ->label('Assignment Response ID')
                    ->searchable()
                    ->sortable(),
                TextColumn::make('user.name')
                    ->label('User')
                    ->searchable()
                    ->sortable(),
                TextColumn::make('from_status')
                    ->searchable()
                    ->sortable(),
                TextColumn::make('to_status')
                    ->searchable()
                    ->sortable(),
                TextColumn::make('notes')
                    ->searchable()
                    ->sortable(),
                TextColumn::make('created_at')
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
            'index' => Pages\ListResponseHistories::route('/'),
            'create' => Pages\CreateResponseHistory::route('/create'),
            'edit' => Pages\EditResponseHistory::route('/{record}/edit'),
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
