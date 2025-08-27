<?php

namespace App\Filament\Resources\AssignmentAttachmentResource;

use App\Filament\Resources\AssignmentAttachmentResource\Pages;
use App\Filament\Resources\AssignmentAttachmentResource\RelationManagers;
use App\Models\AssignmentAttachment;
use BackedEnum;
use Filament\Actions\BulkActionGroup;
use Filament\Actions\DeleteAction;
use Filament\Actions\DeleteBulkAction;
use Filament\Actions\EditAction;
use Filament\Resources\Resource;
use Filament\Tables\Table;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\SoftDeletingScope;
use Filament\Forms\Components\TextInput;
use Filament\Forms\Components\Select;
use Filament\Schemas\Schema;
use Filament\Tables\Columns\TextColumn;

class AssignmentAttachmentResource extends Resource
{
    protected static ?string $model = AssignmentAttachment::class;

    protected static string | BackedEnum | null $navigationIcon = 'heroicon-o-paper-clip';

    public static function form(Schema $form): Schema // Changed from Form to Schema
    {
        return $form
            ->schema([
                Select::make('assignment_id')
                    ->relationship('assignment', 'assignment_label')
                    ->required()
                    ->preload()
                    ->searchable(),
                TextInput::make('original_filename')
                    ->required()
                    ->maxLength(255),
                TextInput::make('stored_path')
                    ->required()
                    ->maxLength(255),
                TextInput::make('mime_type')
                    ->required()
                    ->maxLength(255),
                TextInput::make('file_size_bytes')
                    ->numeric()
                    ->required(),
            ]);
    }

    public static function table(Table $table): Table
    {
        return $table
            ->columns([
                TextColumn::make('assignment.assignment_label')
                    ->label('Assignment')
                    ->searchable()
                    ->sortable(),
                TextColumn::make('original_filename')
                    ->searchable()
                    ->sortable(),
                TextColumn::make('stored_path')
                    ->searchable()
                    ->sortable(),
                TextColumn::make('mime_path')
                    ->searchable()
                    ->sortable(),
                TextColumn::make('file_size_bytes')
                    ->numeric()
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
            'index' => Pages\ListAssignmentAttachments::route('/'),
            'create' => Pages\CreateAssignmentAttachment::route('/create'),
            'edit' => Pages\EditAssignmentAttachment::route('/{record}/edit'),
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
