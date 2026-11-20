<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class GoogleConnection extends Model
{
    public const CONTACTS = 'https://www.googleapis.com/auth/contacts.readonly';
    // Only lets Giftnify manage calendars it created; it can't see the person's other calendars.
    public const CALENDAR = 'https://www.googleapis.com/auth/calendar.app.created';

    protected $fillable = [
        'user_id', 'google_email', 'scopes', 'access_token', 'refresh_token', 'expires_at',
        'calendar_enabled', 'calendar_id', 'calendar_events', 'calendar_synced_at', 'contacts_imported_at', 'last_error',
    ];

    protected $hidden = ['access_token', 'refresh_token'];

    protected $casts = [
        'access_token' => 'encrypted',
        'refresh_token' => 'encrypted',
        'expires_at' => 'datetime',
        'calendar_enabled' => 'boolean',
        'calendar_synced_at' => 'datetime',
        'contacts_imported_at' => 'datetime',
    ];

    public function user()
    {
        return $this->belongsTo(User::class);
    }

    public function has(string $scope): bool
    {
        return in_array($scope, explode(' ', (string)$this->scopes), true);
    }

    public function summary(): array
    {
        return [
            'connected' => true,
            'email' => $this->google_email,
            'contacts' => $this->has(self::CONTACTS),
            'calendar' => $this->has(self::CALENDAR) && $this->calendar_enabled,
            'calendar_events' => $this->calendar_events,
            'calendar_synced_at' => $this->calendar_synced_at?->toISOString(),
            'contacts_imported_at' => $this->contacts_imported_at?->toISOString(),
            'error' => $this->last_error,
        ];
    }
}
