<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class CmsSetting extends Model
{
    protected $primaryKey = 'key';
    public $incrementing = false;
    protected $keyType = 'string';

    protected $fillable = [
        'key',
        'value',
    ];

    protected $casts = [
        'value' => 'array',
    ];

    public static function get(string $key, $default = null)
    {
        $setting = static::find($key);
        return $setting ? $setting->value : $default;
    }
}
