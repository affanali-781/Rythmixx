// import { NextResponse } from 'next/server';

// export async function POST(request: Request) {
//     try {
//         const body = await request.json();
//         console.log('[API Route] Request body:', body);

//         // Create a payload with ONLY the required fields according to the API documentation
//         const apiPayload = {
//             tags_lyrics: body.tags_lyrics,
//             lyrics_input: body.lyrics_input
//         };

//         console.log('[API Route] Sending payload to external API:', apiPayload);

//         const externalResponse = await fetch('https://api-dev.stockgenie.online/generate-music', {
//             method: 'POST',
//             headers: {
//                 'Content-Type': 'application/json',
//                 'Accept': 'application/json',
//             },
//             body: JSON.stringify(apiPayload)
//         });

//         console.log('[API Route] External API status:', externalResponse.status);
        
//         const responseText = await externalResponse.text();
//         console.log('[API Route] External API raw response:', responseText);

//         // Try to parse the response as JSON
//         let data;
//         try {
//             data = JSON.parse(responseText);
//         } catch (parseError) {
//             console.error('[API Route] Parse error:', parseError);
            
//             return NextResponse.json({
//                 error: 'Failed to parse external API response',
//                 details: responseText.substring(0, 500)
//             }, { status: 500 });
//         }

//         return NextResponse.json(data, { status: externalResponse.status });
//     } catch (error) {
//         console.error('[API Route] Unexpected error:', error);
//         return NextResponse.json({
//             error: 'Internal server error',
//             details: error instanceof Error ? error.message : String(error)
//         }, { status: 500 });
//     }
// }




import { NextResponse } from 'next/server';

export async function POST(request: Request) {
    try {
        const formData = await request.formData();
        console.log('[API Route] Incoming formData:', formData);

        // Extract fields from incoming formData (assuming frontend sends it as formData)
        const lrc = formData.get('lrc');
        const text_prompt = formData.get('text_prompt') || '';
        const prompt_type = formData.get('prompt_type');
        const seed = formData.get('seed') || '42';
        const randomize_seed = formData.get('randomize_seed') || 'false';
        const steps = formData.get('steps') || '32';
        const cfg_strength = formData.get('cfg_strength') || '4.0';
        const file_type = formData.get('file_type') || 'wav';
        const odeint_method = formData.get('odeint_method') || 'euler';
        const music_duration = formData.get('music_duration') || '95s';
        const audio_prompt = formData.get('audio_prompt'); // File

        // Now prepare new formData to send to FastAPI backend
        const backendFormData = new FormData();
        backendFormData.append('lrc', lrc as string);
        backendFormData.append('text_prompt', text_prompt as string);
        backendFormData.append('prompt_type', prompt_type as string);
        backendFormData.append('seed', seed.toString());
        backendFormData.append('randomize_seed', randomize_seed.toString());
        backendFormData.append('steps', steps.toString());
        backendFormData.append('cfg_strength', cfg_strength.toString());
        backendFormData.append('file_type', file_type.toString());
        backendFormData.append('odeint_method', odeint_method.toString());
        backendFormData.append('music_duration', music_duration.toString());

        if (audio_prompt instanceof File && audio_prompt.size > 0) {
            backendFormData.append('audio_prompt', audio_prompt);
        }

        console.log('[API Route] Sending formData to FastAPI backend');

        const externalResponse = await fetch('https://api-dev.stockgenie.online/generate-music', {
            method: 'POST',
            body: backendFormData
            // DO NOT set Content-Type here — browser automatically sets correct multipart boundary
        });

        console.log('[API Route] External API status:', externalResponse.status);

        // Since FastAPI returns StreamingResponse (audio file), you probably want to forward it as a blob or stream
        const contentType = externalResponse.headers.get('Content-Type') || 'audio/wav';
        const audioBlob = await externalResponse.blob();

        return new NextResponse(audioBlob, {
            status: externalResponse.status,
            headers: {
                'Content-Type': contentType
            }
        });

    } catch (error) {
        console.error('[API Route] Unexpected error:', error);
        return NextResponse.json({
            error: 'Internal server error',
            details: error instanceof Error ? error.message : String(error)
        }, { status: 500 });
    }
}
