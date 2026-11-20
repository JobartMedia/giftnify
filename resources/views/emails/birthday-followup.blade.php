@extends('emails.layout')
@section('body')
  <h1 style="font-size:26px;line-height:1.15;margin:0 0 12px">Did you celebrate {{ $person['first'] }}? 🎂</h1>
  <p style="font-size:15px;line-height:1.6;color:#6E5A68;margin:0 0 20px">Hi {{ $name }}, {{ $person['first'] }}'s {{ strtolower($person['occasion']) }} was yesterday. If the day got away from you, a belated mystery gift still makes someone smile, and they won't know who it's from until they open it.</p>
  <p style="margin:0 0 24px"><a href="{{ $link }}" style="display:inline-block;background:#E5007D;color:#ffffff;text-decoration:none;font-weight:800;font-size:15px;padding:14px 24px;border-radius:999px">Send {{ $person['first'] }} a belated gift</a></p>
  <p style="font-size:12px;color:#6E5A68;margin:0">Already celebrated them another way? Ignore this. <a href="{{ $settings }}" style="color:#B4005E">Turn off birthday emails</a>.</p>
@endsection
