@extends('emails.layout')
@section('body')
  <h1 style="font-size:26px;line-height:1.15;margin:0 0 12px">{{ $headline }} 🎂</h1>
  <p style="font-size:15px;line-height:1.6;color:#6E5A68;margin:0 0 20px">Hi {{ $name }}, a surprise from you could make their whole day. Schedule a mystery gift now and it opens right on the day.</p>
  @foreach($people as $p)
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border:1px solid #EEE2E9;border-radius:18px;margin:0 0 12px">
      <tr>
        <td style="padding:16px 18px">
          <p style="margin:0;font-size:16px;font-weight:800;color:#251522">{{ $p['name'] }}</p>
          <p style="margin:4px 0 0;font-size:13px;color:#6E5A68">{{ $p['occasion'] }} · {{ $p['date_label'] }} · <strong style="color:#B4005E">{{ $p['when'] }}</strong></p>
        </td>
        <td style="padding:16px 18px;text-align:right;white-space:nowrap">
          <a href="{{ $p['link'] }}" style="display:inline-block;background:#E5007D;color:#ffffff;text-decoration:none;font-weight:800;font-size:13px;padding:11px 18px;border-radius:999px">Send a gift</a>
        </td>
      </tr>
    </table>
  @endforeach
  <p style="font-size:12px;color:#6E5A68;margin:22px 0 0">You get these because you saved these people on Giftnify. <a href="{{ $settings }}" style="color:#B4005E">Turn off birthday reminders</a>.</p>
@endsection
