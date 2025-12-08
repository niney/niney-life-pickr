import { FastifyInstance } from 'fastify'
import { Type } from '@sinclair/typebox'
import { createVWorldConfig } from '../services/vworld/vworld.config'

export default async function vworldRoutes(fastify: FastifyInstance) {
  /**
   * 주소 → 좌표 변환 (Geocoding)
   * VWorld API 프록시 (CORS 우회)
   */
  fastify.get('/geocode', {
    schema: {
      tags: ['vworld'],
      summary: '주소를 좌표로 변환',
      description: 'VWorld Geocoding API를 사용하여 주소를 위도/경도 좌표로 변환합니다.',
      querystring: Type.Object({
        address: Type.String({ description: '변환할 주소' }),
      }),
      response: {
        200: Type.Object({
          result: Type.Boolean(),
          data: Type.Union([
            Type.Object({
              lat: Type.Number({ description: '위도' }),
              lng: Type.Number({ description: '경도' }),
            }),
            Type.Null(),
          ]),
          message: Type.String(),
          timestamp: Type.String(),
        }),
        400: Type.Object({
          result: Type.Boolean(),
          data: Type.Null(),
          message: Type.String(),
          timestamp: Type.String(),
        }),
        500: Type.Object({
          result: Type.Boolean(),
          data: Type.Null(),
          message: Type.String(),
          timestamp: Type.String(),
        }),
      },
    },
  }, async (request, reply) => {
    const { address } = request.query as { address: string }

    if (!address) {
      return reply.status(400).send({
        result: false,
        data: null,
        message: '주소가 필요합니다',
        timestamp: new Date().toISOString(),
      })
    }

    const vworldConfig = createVWorldConfig()
    if (!vworldConfig) {
      return reply.status(500).send({
        result: false,
        data: null,
        message: 'VWorld API 키가 설정되지 않았습니다',
        timestamp: new Date().toISOString(),
      })
    }

    const { apiKey, geocodeUrl } = vworldConfig

    try {
      // 도로명 주소로 먼저 시도
      const roadUrl = `${geocodeUrl}?service=address&request=getcoord&version=2.0&crs=epsg:4326&address=${encodeURIComponent(address)}&format=json&type=road&key=${apiKey}`

      const roadResponse = await fetch(roadUrl)
      const roadData = await roadResponse.json()

      if (roadData.response?.status === 'OK' && roadData.response?.result?.point) {
        return reply.send({
          result: true,
          data: {
            lat: parseFloat(roadData.response.result.point.y),
            lng: parseFloat(roadData.response.result.point.x),
          },
          message: '좌표 변환 성공 (도로명)',
          timestamp: new Date().toISOString(),
        })
      }

      // 지번 주소로 재시도
      const parcelUrl = `${geocodeUrl}?service=address&request=getcoord&version=2.0&crs=epsg:4326&address=${encodeURIComponent(address)}&format=json&type=parcel&key=${apiKey}`

      const parcelResponse = await fetch(parcelUrl)
      const parcelData = await parcelResponse.json()

      if (parcelData.response?.status === 'OK' && parcelData.response?.result?.point) {
        return reply.send({
          result: true,
          data: {
            lat: parseFloat(parcelData.response.result.point.y),
            lng: parseFloat(parcelData.response.result.point.x),
          },
          message: '좌표 변환 성공 (지번)',
          timestamp: new Date().toISOString(),
        })
      }

      // 변환 실패
      return reply.send({
        result: false,
        data: null,
        message: '주소를 좌표로 변환할 수 없습니다',
        timestamp: new Date().toISOString(),
      })
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error'
      fastify.log.error(`VWorld Geocoding 오류: ${errorMessage}`)
      return reply.status(500).send({
        result: false,
        data: null,
        message: `지오코딩 오류: ${error instanceof Error ? error.message : 'Unknown error'}`,
        timestamp: new Date().toISOString(),
      })
    }
  })
}
